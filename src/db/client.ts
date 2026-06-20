import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

import { getDatabaseDialect } from './dialect.js'
import {
  deleteAllConstituentEvents,
  deleteAllDriftEvents,
  deleteAllVendorMappings,
  deleteAllWebhookIngestions,
} from './unified.js'
import { closePostgresDatabase, initPostgresDatabase, resetPostgresDatabase } from './postgresClient.js'
import * as schema from './schema.js'

export type UniSchemaDatabase = BetterSQLite3Database<typeof schema>

let sqlite: Database.Database | undefined
let db: UniSchemaDatabase | undefined

function resolveDatabasePath(): string {
  const url = process.env.DATABASE_URL

  if (!url) {
    return 'data/unischema.db'
  }

  // Normalize all in-memory SQLite URLs — bare `:memory:?cache=shared` would
  // otherwise create a literal file on disk named ":memory:?cache=shared".
  if (url.startsWith(':memory:') || url === 'memory:') {
    return ':memory:'
  }

  if (url.startsWith('file:')) {
    return url.slice('file:'.length)
  }

  return url
}

function createTables(database: Database.Database): void {
  database.exec(`
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
  `)
}

function migrateDriftEventsTable(database: Database.Database): void {
  const columns = database
    .prepare('PRAGMA table_info(drift_events)')
    .all() as Array<{ name: string }>
  const columnNames = new Set(columns.map((column) => column.name))

  if (!columnNames.has('mapper_kind')) {
    database.exec(
      "ALTER TABLE drift_events ADD COLUMN mapper_kind TEXT NOT NULL DEFAULT 'builtin'",
    )
  }

  if (!columnNames.has('mapping_artifact_json')) {
    database.exec('ALTER TABLE drift_events ADD COLUMN mapping_artifact_json TEXT')
  }
}

function migrateWebhookIngestionsTable(database: Database.Database): void {
  const columns = database
    .prepare('PRAGMA table_info(webhook_ingestions)')
    .all() as Array<{ name: string }>
  const columnNames = new Set(columns.map((column) => column.name))

  if (!columnNames.has('claimed_at')) {
    database.exec('ALTER TABLE webhook_ingestions ADD COLUMN claimed_at TEXT')
  }
}

export function initDatabase(): UniSchemaDatabase {
  if (getDatabaseDialect() === 'postgres') {
    throw new Error(
      'Postgres DATABASE_URL detected — call await initPostgresDatabase() before starting the server',
    )
  }

  if (db) {
    return db
  }

  const path = resolveDatabasePath()
  sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  createTables(sqlite)
  migrateDriftEventsTable(sqlite)
  migrateWebhookIngestionsTable(sqlite)
  db = drizzle(sqlite, { schema })

  return db
}

export function getDb(): UniSchemaDatabase {
  if (!db) {
    return initDatabase()
  }

  return db
}

/** Test-only helper — clears all persisted rows between cases. */
export async function resetDatabase(): Promise<void> {
  if (getDatabaseDialect() === 'postgres') {
    await resetPostgresDatabase()
    return
  }

  await deleteAllConstituentEvents()
  await deleteAllWebhookIngestions()
  await deleteAllDriftEvents()
  await deleteAllVendorMappings()
}

export function closeDatabase(): void {
  sqlite?.close()
  sqlite = undefined
  db = undefined
}

export { getDatabaseDialect, initPostgresDatabase, closePostgresDatabase }
