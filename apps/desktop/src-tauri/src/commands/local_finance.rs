use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;
use uuid::Uuid;

use crate::database::DatabaseState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalMutationCommand {
    operation_id: String,
    idempotency_key: String,
    entity_type: String,
    entity_id: String,
    base_version: u64,
    payload: EntityPayload,
    deleted_at: Option<String>,
    occurred_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "entityType", rename_all = "lowercase", deny_unknown_fields)]
pub enum EntityPayload {
    Account {
        name: String,
        #[serde(rename = "type")]
        account_type: AccountType,
        institution: Option<String>,
        color: String,
        #[serde(rename = "openingBalance")]
        opening_balance: i64,
        #[serde(rename = "openingBalanceDate")]
        opening_balance_date: String,
        status: AccountStatus,
        #[serde(rename = "displayOrder")]
        display_order: u64,
    },
    Category {
        name: String,
        kind: TransactionKind,
        #[serde(rename = "parentId")]
        parent_id: Option<String>,
        status: CategoryStatus,
        #[serde(rename = "displayOrder")]
        display_order: u64,
    },
    Transaction {
        kind: TransactionKind,
        description: String,
        value: i64,
        #[serde(rename = "categoryId")]
        category_id: String,
        #[serde(rename = "accountId")]
        account_id: Option<String>,
        #[serde(rename = "dueDate")]
        due_date: String,
        state: TransactionState,
    },
    Transfer {
        #[serde(rename = "sourceAccountId")]
        source_account_id: String,
        #[serde(rename = "destinationAccountId")]
        destination_account_id: String,
        description: String,
        value: i64,
        date: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountType {
    Checking,
    Digital,
    Savings,
    Cash,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountStatus {
    Active,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CategoryStatus {
    Active,
    Inactive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransactionKind {
    Expense,
    Income,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TransactionState {
    Pending,
    Settled,
}

impl TryFrom<Value> for EntityPayload {
    type Error = LocalFinanceError;

    fn try_from(value: Value) -> Result<Self, Self::Error> {
        serde_json::from_value(value).map_err(|_| LocalFinanceError::InvalidCommand)
    }
}

impl EntityPayload {
    fn entity_type(&self) -> &'static str {
        match self {
            Self::Account { .. } => "account",
            Self::Category { .. } => "category",
            Self::Transaction { .. } => "transaction",
            Self::Transfer { .. } => "transfer",
        }
    }

    fn validate(&self) -> Result<(), LocalFinanceError> {
        match self {
            Self::Account {
                name,
                institution,
                color,
                opening_balance_date,
                ..
            } => {
                require_name(name)?;
                if institution
                    .as_ref()
                    .is_some_and(|value| !valid_required_text(value, 120))
                {
                    return Err(LocalFinanceError::InvalidCommand);
                }
                if !valid_color(color) || !valid_calendar_date(opening_balance_date) {
                    return Err(LocalFinanceError::InvalidCommand);
                }
            }
            Self::Category {
                name, parent_id, ..
            } => {
                require_name(name)?;
                if parent_id.as_ref().is_some_and(|value| !valid_uuid(value)) {
                    return Err(LocalFinanceError::InvalidCommand);
                }
            }
            Self::Transaction {
                description,
                value,
                category_id,
                account_id,
                due_date,
                state,
                ..
            } => {
                require_description(description)?;
                if *value <= 0
                    || !valid_uuid(category_id)
                    || account_id.as_ref().is_some_and(|value| !valid_uuid(value))
                    || !valid_calendar_date(due_date)
                    || (*state == TransactionState::Settled && account_id.is_none())
                {
                    return Err(LocalFinanceError::InvalidCommand);
                }
            }
            Self::Transfer {
                source_account_id,
                destination_account_id,
                description,
                value,
                date,
            } => {
                require_description(description)?;
                let source = Uuid::parse_str(source_account_id)
                    .map_err(|_| LocalFinanceError::InvalidCommand)?;
                let destination = Uuid::parse_str(destination_account_id)
                    .map_err(|_| LocalFinanceError::InvalidCommand)?;
                if source == destination || *value <= 0 || !valid_calendar_date(date) {
                    return Err(LocalFinanceError::InvalidCommand);
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MutationReceipt {
    operation_id: String,
    entity_id: String,
    version: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Error)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LocalFinanceError {
    #[error("the local mutation command is invalid")]
    InvalidCommand,
    #[error("the entity version does not match")]
    VersionConflict,
    #[error("local finance storage is unavailable")]
    StorageUnavailable,
}

#[tauri::command]
pub fn apply_local_mutation(
    state: tauri::State<'_, DatabaseState>,
    command: LocalMutationCommand,
) -> Result<MutationReceipt, LocalFinanceError> {
    let mut connection = state
        .connection
        .lock()
        .map_err(|_| LocalFinanceError::StorageUnavailable)?;
    apply_local_mutation_in_connection(&mut connection, command, || Ok(()))
}

fn apply_local_mutation_in_connection<F>(
    connection: &mut Connection,
    mut command: LocalMutationCommand,
    before_outbox_insert: F,
) -> Result<MutationReceipt, LocalFinanceError>
where
    F: FnOnce() -> Result<(), LocalFinanceError>,
{
    validate_command(&mut command)?;
    let payload =
        serde_json::to_string(&command.payload).map_err(|_| LocalFinanceError::InvalidCommand)?;
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|_| LocalFinanceError::StorageUnavailable)?;

    let previous_receipt = transaction
        .query_row(
            "SELECT operation_id, entity_id, result_version \
             FROM outbox WHERE idempotency_key = ?1",
            [&command.idempotency_key],
            |row| {
                Ok(MutationReceipt {
                    operation_id: row.get(0)?,
                    entity_id: row.get(1)?,
                    version: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|_| LocalFinanceError::StorageUnavailable)?;
    if let Some(receipt) = previous_receipt {
        transaction
            .commit()
            .map_err(|_| LocalFinanceError::StorageUnavailable)?;
        return Ok(receipt);
    }

    let current = transaction
        .query_row(
            "SELECT version, entity_type FROM entities WHERE id = ?1",
            [&command.entity_id],
            |row| Ok((row.get::<_, u64>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|_| LocalFinanceError::StorageUnavailable)?;
    let current_version = current.as_ref().map_or(0, |(version, _)| *version);
    if current_version != command.base_version
        || current
            .as_ref()
            .is_some_and(|(_, entity_type)| entity_type != &command.entity_type)
    {
        return Err(LocalFinanceError::VersionConflict);
    }
    let next_version = current_version
        .checked_add(1)
        .ok_or(LocalFinanceError::StorageUnavailable)?;

    transaction
        .execute(
            "INSERT INTO entities (
                id, entity_type, version, payload, created_at, updated_at, deleted_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                entity_type = excluded.entity_type,
                version = excluded.version,
                payload = excluded.payload,
                updated_at = excluded.updated_at,
                deleted_at = excluded.deleted_at",
            params![
                command.entity_id,
                command.entity_type,
                next_version,
                payload,
                command.occurred_at,
                command.deleted_at,
            ],
        )
        .map_err(|_| LocalFinanceError::StorageUnavailable)?;

    before_outbox_insert()?;

    transaction
        .execute(
            "INSERT INTO outbox (
                operation_id, idempotency_key, entity_id, entity_type, base_version,
                result_version, payload, deleted_at, occurred_at, attempt_count, last_error
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, NULL)",
            params![
                command.operation_id,
                command.idempotency_key,
                command.entity_id,
                command.entity_type,
                command.base_version,
                next_version,
                payload,
                command.deleted_at,
                command.occurred_at,
            ],
        )
        .map_err(|_| LocalFinanceError::StorageUnavailable)?;

    let receipt = MutationReceipt {
        operation_id: command.operation_id,
        entity_id: command.entity_id,
        version: next_version,
    };
    transaction
        .commit()
        .map_err(|_| LocalFinanceError::StorageUnavailable)?;
    Ok(receipt)
}

fn validate_command(command: &mut LocalMutationCommand) -> Result<(), LocalFinanceError> {
    if command.idempotency_key.trim().is_empty()
        || command.base_version >= i64::MAX as u64
        || command.entity_type != command.payload.entity_type()
        || !valid_timestamp(&command.occurred_at)
        || command
            .deleted_at
            .as_ref()
            .is_some_and(|value| !valid_timestamp(value))
    {
        return Err(LocalFinanceError::InvalidCommand);
    }
    command.operation_id = canonical_uuid(&command.operation_id)?;
    command.entity_id = canonical_uuid(&command.entity_id)?;
    command.idempotency_key = command.idempotency_key.trim().to_owned();
    command.payload.validate()
}

fn canonical_uuid(value: &str) -> Result<String, LocalFinanceError> {
    Uuid::parse_str(value)
        .map(|uuid| uuid.to_string())
        .map_err(|_| LocalFinanceError::InvalidCommand)
}

fn valid_uuid(value: &str) -> bool {
    Uuid::parse_str(value).is_ok()
}

fn valid_required_text(value: &str, max_chars: usize) -> bool {
    value == value.trim() && !value.is_empty() && value.chars().count() <= max_chars
}

fn require_name(value: &str) -> Result<(), LocalFinanceError> {
    if valid_required_text(value, 120) {
        Ok(())
    } else {
        Err(LocalFinanceError::InvalidCommand)
    }
}

fn require_description(value: &str) -> Result<(), LocalFinanceError> {
    if value == value.trim() && value.chars().count() <= 240 {
        Ok(())
    } else {
        Err(LocalFinanceError::InvalidCommand)
    }
}

fn valid_color(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..].bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn valid_calendar_date(value: &str) -> bool {
    if !value.is_ascii()
        || value.len() != 10
        || value.as_bytes().get(4) != Some(&b'-')
        || value.as_bytes().get(7) != Some(&b'-')
    {
        return false;
    }
    let Ok(year) = value[0..4].parse::<u32>() else {
        return false;
    };
    let Ok(month) = value[5..7].parse::<u32>() else {
        return false;
    };
    let Ok(day) = value[8..10].parse::<u32>() else {
        return false;
    };
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if year % 400 == 0 || (year % 4 == 0 && year % 100 != 0) => 29,
        2 => 28,
        _ => return false,
    };
    (1..=days).contains(&day)
}

fn valid_timestamp(value: &str) -> bool {
    if !value.is_ascii()
        || value.len() < 20
        || !valid_calendar_date(&value[..10])
        || value.as_bytes().get(10) != Some(&b'T')
        || value.as_bytes().get(13) != Some(&b':')
        || value.as_bytes().get(16) != Some(&b':')
    {
        return false;
    }

    let Some(hour) = parse_two_digits(value, 11) else {
        return false;
    };
    let Some(minute) = parse_two_digits(value, 14) else {
        return false;
    };
    let Some(second) = parse_two_digits(value, 17) else {
        return false;
    };
    if hour > 23 || minute > 59 || second > 59 {
        return false;
    }

    let mut zone_index = 19;
    if value.as_bytes().get(zone_index) == Some(&b'.') {
        zone_index += 1;
        let fraction_start = zone_index;
        while value
            .as_bytes()
            .get(zone_index)
            .is_some_and(u8::is_ascii_digit)
        {
            zone_index += 1;
        }
        if zone_index == fraction_start {
            return false;
        }
    }

    if value.get(zone_index..) == Some("Z") {
        return true;
    }
    if value.len() != zone_index + 6
        || !matches!(value.as_bytes().get(zone_index), Some(b'+') | Some(b'-'))
        || value.as_bytes().get(zone_index + 3) != Some(&b':')
    {
        return false;
    }
    let Some(offset_hour) = parse_two_digits(value, zone_index + 1) else {
        return false;
    };
    let Some(offset_minute) = parse_two_digits(value, zone_index + 4) else {
        return false;
    };
    offset_hour <= 23 && offset_minute <= 59
}

fn parse_two_digits(value: &str, start: usize) -> Option<u8> {
    value.get(start..start + 2)?.parse().ok()
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use serde_json::json;
    use tempfile::tempdir;

    use crate::database::EncryptedDatabase;

    use super::{
        apply_local_mutation_in_connection, EntityPayload, LocalFinanceError, LocalMutationCommand,
    };

    const ENTITY_ID: &str = "00000000-0000-4000-8000-000000000004";
    const OPERATION_ID: &str = "00000000-0000-4000-8000-000000000005";
    const OCCURRED_AT: &str = "2026-07-13T12:00:00.000Z";

    fn command(idempotency_key: &str) -> LocalMutationCommand {
        LocalMutationCommand {
            operation_id: OPERATION_ID.to_owned(),
            idempotency_key: idempotency_key.to_owned(),
            entity_type: "account".to_owned(),
            entity_id: ENTITY_ID.to_owned(),
            base_version: 0,
            payload: EntityPayload::try_from(json!({
                "entityType": "account",
                "name": "Conta principal",
                "type": "checking",
                "color": "#123456",
                "openingBalance": 10_000,
                "openingBalanceDate": "2026-07-13",
                "status": "active",
                "displayOrder": 0
            }))
            .expect("valid account payload"),
            deleted_at: None,
            occurred_at: OCCURRED_AT.to_owned(),
        }
    }

    fn database_connection() -> (tempfile::TempDir, Connection) {
        let directory = tempdir().expect("temporary database directory");
        let database = EncryptedDatabase::open(
            &directory.path().join("orbe.sqlite3"),
            &directory.path().join("backups"),
            &[0x31; 32],
        )
        .expect("encrypted database");
        (directory, database.into_connection())
    }

    #[test]
    fn rolls_back_entity_when_failure_occurs_before_outbox_insert() {
        let (_directory, mut connection) = database_connection();

        let result =
            apply_local_mutation_in_connection(&mut connection, command("device-A:42"), || {
                Err(LocalFinanceError::StorageUnavailable)
            });

        assert!(result.is_err());
        assert_eq!(row_count(&connection, "entities"), 0);
        assert_eq!(row_count(&connection, "outbox"), 0);
    }

    #[test]
    fn writes_entity_and_outbox_once_and_returns_the_original_idempotent_receipt() {
        let (_directory, mut connection) = database_connection();

        let first =
            apply_local_mutation_in_connection(&mut connection, command("device-A:42"), || Ok(()))
                .expect("first mutation should succeed");
        let retried =
            apply_local_mutation_in_connection(&mut connection, command("device-A:42"), || Ok(()))
                .expect("retry should return its original receipt");

        assert_eq!(first, retried);
        assert_eq!(first.version, 1);
        assert_eq!(row_count(&connection, "entities"), 1);
        assert_eq!(row_count(&connection, "outbox"), 1);
    }

    fn row_count(connection: &Connection, table: &str) -> i64 {
        connection
            .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                row.get(0)
            })
            .expect("row count")
    }
}
