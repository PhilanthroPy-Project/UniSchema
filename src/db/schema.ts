import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const vendorMappings = sqliteTable('vendor_mappings', {
  vendor: text('vendor').primaryKey(),
  mappingsJson: text('mappings_json').notNull(),
  metadataMappingsJson: text('metadata_mappings_json').notNull().default('[]'),
  exportedAt: text('exported_at').notNull(),
  syncedAt: text('synced_at').notNull(),
})

export const driftEvents = sqliteTable(
  'drift_events',
  {
    id: text('id').primaryKey(),
    vendor: text('vendor').notNull(),
    rawPayloadJson: text('raw_payload_json').notNull(),
    validationErrorsJson: text('validation_errors_json').notNull(),
    capturedAt: text('captured_at').notNull(),
    status: text('status').notNull().default('pending'),
    localFixturePath: text('local_fixture_path'),
    localTestPath: text('local_test_path'),
    mapperKind: text('mapper_kind').notNull().default('builtin'),
    mappingArtifactJson: text('mapping_artifact_json'),
  },
  (table) => [index('drift_events_vendor_idx').on(table.vendor)],
)

export const webhookIngestions = sqliteTable('webhook_ingestions', {
  id: text('id').primaryKey(),
  vendor: text('vendor').notNull(),
  rawPayloadJson: text('raw_payload_json').notNull(),
  status: text('status').notNull().default('pending'),
  resultJson: text('result_json'),
  errorJson: text('error_json'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
})

export const constituentEvents = sqliteTable(
  'constituent_events',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().unique(),
    vendor: text('vendor').notNull(),
    eventJson: text('event_json').notNull(),
    egressStatus: text('egress_status').notNull().default('pending'),
    createdAt: text('created_at').notNull(),
    exportedAt: text('exported_at'),
  },
  (table) => [index('constituent_events_egress_idx').on(table.egressStatus)],
)
