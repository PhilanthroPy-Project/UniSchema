import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema.js'

export type UniSchemaPostgresDatabase = PostgresJsDatabase<typeof schema>

let sql: ReturnType<typeof postgres> | undefined
let db: UniSchemaPostgresDatabase | undefined

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS vendor_mappings (
  vendor TEXT PRIMARY KEY NOT NULL,
  mappings_json TEXT NOT NULL,
  metadata_mappings_json TEXT NOT NULL DEFAULT '[]',
  exported_at TEXT NOT NULL,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drift_events (
  id TEXT PRIMARY KEY NOT NULL,
  vendor TEXT NOT NULL,
  raw_payload_json TEXT NOT NULL,
  validation_errors_json TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  local_fixture_path TEXT,
  local_test_path TEXT,
  mapper_kind TEXT NOT NULL DEFAULT 'builtin',
  mapping_artifact_json TEXT
);

CREATE INDEX IF NOT EXISTS drift_events_vendor_idx ON drift_events (vendor);

CREATE TABLE IF NOT EXISTS webhook_ingestions (
  id TEXT PRIMARY KEY NOT NULL,
  vendor TEXT NOT NULL,
  raw_payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_json TEXT,
  error_json TEXT,
  created_at TEXT NOT NULL,
  claimed_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS constituent_events (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  vendor TEXT NOT NULL,
  event_json TEXT NOT NULL,
  egress_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  exported_at TEXT
);

CREATE INDEX IF NOT EXISTS constituent_events_egress_idx ON constituent_events (egress_status);

CREATE TABLE IF NOT EXISTS mapping_audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  vendor TEXT NOT NULL,
  actor TEXT NOT NULL,
  diff_hash TEXT NOT NULL,
  synced_at TEXT NOT NULL
);
`

export async function initPostgresDatabase(): Promise<UniSchemaPostgresDatabase> {
  if (db) {
    return db
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Postgres')
  }

  sql = postgres(connectionString, { max: 10 })
  await sql.unsafe(CREATE_TABLES_SQL)
  await sql.unsafe(
    'ALTER TABLE webhook_ingestions ADD COLUMN IF NOT EXISTS claimed_at TEXT',
  )
  db = drizzle(sql, { schema })

  return db
}

export function getPostgresDb(): UniSchemaPostgresDatabase {
  if (!db) {
    throw new Error('Postgres database not initialized — call initPostgresDatabase() first')
  }

  return db
}

export async function closePostgresDatabase(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 })
  }

  sql = undefined
  db = undefined
}

export async function resetPostgresDatabase(): Promise<void> {
  if (!sql) {
    return
  }

  await sql.unsafe(`
    DELETE FROM constituent_events;
    DELETE FROM webhook_ingestions;
    DELETE FROM drift_events;
    DELETE FROM vendor_mappings;
    DELETE FROM mapping_audit_log;
  `)
}
