pub mod key;
mod migrations;

use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use rusqlite::Connection;
use thiserror::Error;

use migrations::{apply_pending, back_up_before_migration, LATEST_SCHEMA_VERSION};

pub struct EncryptedDatabase {
    connection: Connection,
}

impl EncryptedDatabase {
    pub fn open(
        database_path: &Path,
        backups_path: &Path,
        key: &[u8; 32],
    ) -> Result<Self, DatabaseError> {
        if let Some(parent) = database_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let current_version = inspect_schema_version(database_path, key)?;
        if current_version < LATEST_SCHEMA_VERSION {
            back_up_before_migration(database_path, backups_path, LATEST_SCHEMA_VERSION)?;
        }

        let mut connection = open_encrypted_connection(database_path, key)?;
        apply_pending(&mut connection, current_version)?;
        Ok(Self { connection })
    }

    pub fn connection(&self) -> &Connection {
        &self.connection
    }

    pub fn into_connection(self) -> Connection {
        self.connection
    }
}

pub struct DatabaseState {
    pub(crate) connection: Mutex<Connection>,
}

impl DatabaseState {
    pub fn new(database: EncryptedDatabase) -> Self {
        Self {
            connection: Mutex::new(database.into_connection()),
        }
    }
}

fn inspect_schema_version(database_path: &Path, key: &[u8; 32]) -> Result<u32, DatabaseError> {
    if !database_path.exists() || fs::metadata(database_path)?.len() == 0 {
        return Ok(0);
    }

    let connection = open_encrypted_connection(database_path, key)?;
    let version = connection.pragma_query_value(None, "user_version", |row| row.get(0))?;
    drop(connection);
    Ok(version)
}

fn open_encrypted_connection(path: &Path, key: &[u8; 32]) -> Result<Connection, DatabaseError> {
    let connection = Connection::open(path)?;
    let encoded_key = hex::encode(key);
    connection.pragma_update(None, "key", encoded_key)?;

    let cipher_version = connection
        .query_row("PRAGMA cipher_version", [], |row| row.get::<_, String>(0))
        .map_err(|_| DatabaseError::SqlCipherUnavailable)?;
    if cipher_version.trim().is_empty() {
        return Err(DatabaseError::SqlCipherUnavailable);
    }

    connection.pragma_update(None, "foreign_keys", true)?;
    Ok(connection)
}

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("encrypted database is unavailable")]
    Sql(#[from] rusqlite::Error),
    #[error("encrypted database file operation failed")]
    Io(#[from] std::io::Error),
    #[error("SQLCipher support is unavailable")]
    SqlCipherUnavailable,
    #[error("system clock is unavailable")]
    Clock,
}
