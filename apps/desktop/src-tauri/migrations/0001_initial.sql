CREATE TABLE entities (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE outbox (
    operation_id TEXT PRIMARY KEY NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    base_version INTEGER NOT NULL CHECK (base_version >= 0),
    result_version INTEGER NOT NULL CHECK (result_version > 0),
    payload TEXT NOT NULL,
    deleted_at TEXT,
    occurred_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    last_error TEXT
);

CREATE INDEX outbox_entity_id_idx ON outbox (entity_id);

CREATE TABLE sync_cursor (
    singleton INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (singleton = 1),
    cursor INTEGER NOT NULL DEFAULT 0 CHECK (cursor >= 0)
);

INSERT INTO sync_cursor (singleton, cursor) VALUES (1, 0);

CREATE TABLE schema_migrations (
    schema_version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
);
