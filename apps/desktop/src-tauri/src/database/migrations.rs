use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{Connection, TransactionBehavior};

use super::DatabaseError;

pub const LATEST_SCHEMA_VERSION: u32 = 1;
const BACKUP_PREFIX: &str = "pre-migration-";
const BACKUPS_TO_RETAIN: usize = 3;

pub fn apply_pending(
    connection: &mut Connection,
    current_version: u32,
) -> Result<(), DatabaseError> {
    if current_version >= LATEST_SCHEMA_VERSION {
        return Ok(());
    }

    let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
    if current_version < 1 {
        transaction.execute_batch(include_str!("../../migrations/0001_initial.sql"))?;
        transaction.execute(
            "INSERT INTO schema_migrations (schema_version, applied_at) \
             VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            [],
        )?;
        transaction.pragma_update(None, "user_version", 1_u32)?;
    }
    transaction.commit()?;
    Ok(())
}

pub fn back_up_before_migration(
    database_path: &Path,
    backups_path: &Path,
    target_schema: u32,
) -> Result<Option<PathBuf>, DatabaseError> {
    if !database_path.exists() || fs::metadata(database_path)?.len() == 0 {
        return Ok(None);
    }

    fs::create_dir_all(backups_path)?;
    let utc_nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| DatabaseError::Clock)?
        .as_nanos();
    let backup_path = backups_path.join(format!(
        "{BACKUP_PREFIX}{target_schema}-{utc_nanos}.sqlite3"
    ));
    fs::copy(database_path, &backup_path)?;
    retain_newest_backups(backups_path)?;
    Ok(Some(backup_path))
}

fn retain_newest_backups(backups_path: &Path) -> Result<(), DatabaseError> {
    let mut backups = fs::read_dir(backups_path)?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with(BACKUP_PREFIX)
        })
        .collect::<Vec<_>>();
    backups.sort_by_key(backup_utc_nanos);

    let remove_count = backups.len().saturating_sub(BACKUPS_TO_RETAIN);
    for backup in backups.into_iter().take(remove_count) {
        fs::remove_file(backup.path())?;
    }
    Ok(())
}

fn backup_utc_nanos(entry: &fs::DirEntry) -> u128 {
    entry
        .file_name()
        .to_string_lossy()
        .strip_suffix(".sqlite3")
        .and_then(|name| name.rsplit_once('-'))
        .and_then(|(_, utc_nanos)| utc_nanos.parse().ok())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::back_up_before_migration;

    #[test]
    fn retains_only_the_three_newest_pre_migration_backups() {
        let directory = tempdir().expect("temporary directory");
        let database_path = directory.path().join("orbe.sqlite3");
        let backups_path = directory.path().join("backups");
        fs::write(&database_path, b"encrypted database bytes").expect("database fixture");

        for schema in [9, 10, 11, 12] {
            let backup = back_up_before_migration(&database_path, &backups_path, schema)
                .expect("backup should succeed")
                .expect("existing database should be backed up");
            assert!(backup.exists());
        }

        let backup_names = fs::read_dir(backups_path)
            .expect("backup directory")
            .map(|entry| {
                entry
                    .expect("backup entry")
                    .file_name()
                    .to_string_lossy()
                    .into_owned()
            })
            .collect::<Vec<_>>();
        assert_eq!(backup_names.len(), 3);
        assert!(backup_names
            .iter()
            .all(|name| !name.starts_with("pre-migration-9-")));
    }
}
