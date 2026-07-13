use desktop_lib::database::EncryptedDatabase;
use rusqlite::Connection;
use tempfile::tempdir;

const KEY: [u8; 32] = [0x2a; 32];

#[test]
fn opens_an_encrypted_database_and_applies_the_initial_schema() {
    let directory = tempdir().expect("temporary database directory");
    let database_path = directory.path().join("orbe.sqlite3");
    let backups_path = directory.path().join("backups");

    let database = EncryptedDatabase::open(&database_path, &backups_path, &KEY)
        .expect("encrypted database should open");

    let cipher_version: String = database
        .connection()
        .query_row("PRAGMA cipher_version", [], |row| row.get(0))
        .expect("SQLCipher must report its version");
    assert!(!cipher_version.trim().is_empty());

    for table in ["entities", "outbox", "sync_cursor", "schema_migrations"] {
        let count: i64 = database
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                [table],
                |row| row.get(0),
            )
            .expect("schema lookup should succeed");
        assert_eq!(count, 1, "missing table {table}");
    }

    drop(database);

    let wrong_key = [0x7b; 32];
    assert!(EncryptedDatabase::open(&database_path, &backups_path, &wrong_key).is_err());

    let plain_connection =
        Connection::open(&database_path).expect("plain SQLite can open the file handle");
    assert!(plain_connection
        .query_row("SELECT COUNT(*) FROM entities", [], |row| row
            .get::<_, i64>(0))
        .is_err());
}
