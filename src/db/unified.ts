import { and, desc, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm'

import { getDb } from './client.js'
import { getDatabaseDialect } from './dialect.js'
import { getPostgresDb } from './postgresClient.js'
import {
  constituentEvents,
  driftEvents,
  vendorMappings,
  webhookIngestions,
} from './schema.js'

function isPostgres(): boolean {
  return getDatabaseDialect() === 'postgres'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pgDb(): any {
  return getPostgresDb()
}

export async function insertWebhookIngestion(values: typeof webhookIngestions.$inferInsert): Promise<void> {
  if (isPostgres()) {
    await pgDb().insert(webhookIngestions).values(values)
    return
  }

  getDb().insert(webhookIngestions).values(values).run()
}

export async function selectWebhookIngestionById(
  id: string,
): Promise<typeof webhookIngestions.$inferSelect | undefined> {
  if (isPostgres()) {
    const rows = await pgDb()
      .select()
      .from(webhookIngestions)
      .where(eq(webhookIngestions.id, id))
      .limit(1)

    return rows[0]
  }

  return getDb().select().from(webhookIngestions).where(eq(webhookIngestions.id, id)).get()
}

export async function claimWebhookIngestion(id: string): Promise<number> {
  const claimedAt = new Date().toISOString()

  if (isPostgres()) {
    const rows = await pgDb()
      .update(webhookIngestions)
      .set({ status: 'processing', claimedAt })
      .where(and(eq(webhookIngestions.id, id), eq(webhookIngestions.status, 'pending')))
      .returning({ id: webhookIngestions.id })

    return rows.length
  }

  return getDb()
    .update(webhookIngestions)
    .set({ status: 'processing', claimedAt })
    .where(and(eq(webhookIngestions.id, id), eq(webhookIngestions.status, 'pending')))
    .run().changes
}

export async function listStaleWebhookIngestions(
  threshold: string,
): Promise<Array<typeof webhookIngestions.$inferSelect>> {
  if (isPostgres()) {
    return pgDb()
      .select()
      .from(webhookIngestions)
      .where(and(eq(webhookIngestions.status, 'pending'), lt(webhookIngestions.createdAt, threshold)))
  }

  return getDb()
    .select()
    .from(webhookIngestions)
    .where(and(eq(webhookIngestions.status, 'pending'), lt(webhookIngestions.createdAt, threshold)))
    .all()
}

export async function releaseStaleProcessingIngestionRows(threshold: string): Promise<number> {
  const staleClaim = or(
    and(isNotNull(webhookIngestions.claimedAt), lt(webhookIngestions.claimedAt, threshold)),
    and(isNull(webhookIngestions.claimedAt), lt(webhookIngestions.createdAt, threshold)),
  )
  const where = and(eq(webhookIngestions.status, 'processing'), staleClaim)

  if (isPostgres()) {
    const rows = await pgDb()
      .update(webhookIngestions)
      .set({ status: 'pending' })
      .where(where)
      .returning({ id: webhookIngestions.id })

    return rows.length
  }

  return getDb().update(webhookIngestions).set({ status: 'pending' }).where(where).run().changes
}

export async function completeWebhookIngestion(
  id: string,
  resultJson: string,
  completedAt: string,
): Promise<void> {
  const where = and(
    eq(webhookIngestions.id, id),
    or(eq(webhookIngestions.status, 'processing'), eq(webhookIngestions.status, 'pending')),
  )

  if (isPostgres()) {
    await pgDb()
      .update(webhookIngestions)
      .set({ status: 'completed', resultJson, completedAt })
      .where(where)
    return
  }

  getDb()
    .update(webhookIngestions)
    .set({ status: 'completed', resultJson, completedAt })
    .where(where)
    .run()
}

export async function failWebhookIngestion(
  id: string,
  errorJson: string,
  completedAt: string,
): Promise<void> {
  const where = and(
    eq(webhookIngestions.id, id),
    or(eq(webhookIngestions.status, 'processing'), eq(webhookIngestions.status, 'pending')),
  )

  if (isPostgres()) {
    await pgDb()
      .update(webhookIngestions)
      .set({ status: 'failed', errorJson, completedAt })
      .where(where)
    return
  }

  getDb()
    .update(webhookIngestions)
    .set({ status: 'failed', errorJson, completedAt })
    .where(where)
    .run()
}

export async function deleteAllWebhookIngestions(): Promise<void> {
  if (isPostgres()) {
    await pgDb().delete(webhookIngestions)
    return
  }

  getDb().delete(webhookIngestions).run()
}

export async function insertDriftEvent(values: typeof driftEvents.$inferInsert): Promise<void> {
  if (isPostgres()) {
    await pgDb().insert(driftEvents).values(values)
    return
  }

  getDb().insert(driftEvents).values(values).run()
}

export async function selectDriftEventById(
  id: string,
): Promise<typeof driftEvents.$inferSelect | undefined> {
  if (isPostgres()) {
    const rows = await pgDb()
      .select()
      .from(driftEvents)
      .where(eq(driftEvents.id, id))
      .limit(1)

    return rows[0]
  }

  return getDb().select().from(driftEvents).where(eq(driftEvents.id, id)).get()
}

export async function listDriftEventRows(
  vendor: string | undefined,
  limit: number,
  status?: string,
): Promise<Array<typeof driftEvents.$inferSelect>> {
  const filters = []

  if (vendor) {
    filters.push(eq(driftEvents.vendor, vendor))
  }

  if (status) {
    filters.push(eq(driftEvents.status, status))
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined

  if (isPostgres()) {
    return pgDb()
      .select()
      .from(driftEvents)
      .where(whereClause)
      .orderBy(desc(driftEvents.capturedAt))
      .limit(limit)
  }

  return getDb()
    .select()
    .from(driftEvents)
    .where(whereClause)
    .orderBy(desc(driftEvents.capturedAt))
    .limit(limit)
    .all()
}

export async function markDriftEventProcessedRow(id: string): Promise<number> {
  if (isPostgres()) {
    const rows = await pgDb()
      .update(driftEvents)
      .set({ status: 'processed' })
      .where(eq(driftEvents.id, id))
      .returning({ id: driftEvents.id })

    return rows.length
  }

  return getDb()
    .update(driftEvents)
    .set({ status: 'processed' })
    .where(eq(driftEvents.id, id))
    .run().changes
}

export async function deleteAllDriftEvents(): Promise<void> {
  if (isPostgres()) {
    await pgDb().delete(driftEvents)
    return
  }

  getDb().delete(driftEvents).run()
}

export async function selectConstituentEventByEventId(
  eventId: string,
): Promise<typeof constituentEvents.$inferSelect | undefined> {
  if (isPostgres()) {
    const rows = await pgDb()
      .select()
      .from(constituentEvents)
      .where(eq(constituentEvents.eventId, eventId))
      .limit(1)

    return rows[0]
  }

  return getDb().select().from(constituentEvents).where(eq(constituentEvents.eventId, eventId)).get()
}

export async function insertConstituentEvent(
  values: typeof constituentEvents.$inferInsert,
): Promise<boolean> {
  if (isPostgres()) {
    const rows = await pgDb()
      .insert(constituentEvents)
      .values(values)
      .onConflictDoNothing({ target: constituentEvents.eventId })
      .returning({ id: constituentEvents.id })

    return rows.length > 0
  }

  try {
    getDb().insert(constituentEvents).values(values).run()
    return true
  } catch (error) {
    if (isSqliteUniqueConstraintError(error)) {
      return false
    }

    throw error
  }
}

function isSqliteUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  )
}

export async function listPendingConstituentEventRows(
  limit: number,
): Promise<Array<typeof constituentEvents.$inferSelect>> {
  if (isPostgres()) {
    return pgDb()
      .select()
      .from(constituentEvents)
      .where(eq(constituentEvents.egressStatus, 'pending'))
      .limit(limit)
  }

  return getDb()
    .select()
    .from(constituentEvents)
    .where(eq(constituentEvents.egressStatus, 'pending'))
    .limit(limit)
    .all()
}

export async function acknowledgeConstituentEvents(ids: string[], exportedAt: string): Promise<number> {
  if (ids.length === 0) {
    return 0
  }

  if (isPostgres()) {
    const rows = await pgDb()
      .update(constituentEvents)
      .set({ egressStatus: 'exported', exportedAt })
      .where(inArray(constituentEvents.id, ids))
      .returning({ id: constituentEvents.id })

    return rows.length
  }

  return getDb()
    .update(constituentEvents)
    .set({ egressStatus: 'exported', exportedAt })
    .where(inArray(constituentEvents.id, ids))
    .run().changes
}

export async function deleteAllConstituentEvents(): Promise<void> {
  if (isPostgres()) {
    await pgDb().delete(constituentEvents)
    return
  }

  getDb().delete(constituentEvents).run()
}

export async function upsertVendorMappingRow(values: typeof vendorMappings.$inferInsert): Promise<void> {
  if (isPostgres()) {
    await pgDb()
      .insert(vendorMappings)
      .values(values)
      .onConflictDoUpdate({
        target: vendorMappings.vendor,
        set: {
          mappingsJson: values.mappingsJson,
          metadataMappingsJson: values.metadataMappingsJson,
          exportedAt: values.exportedAt,
          syncedAt: values.syncedAt,
        },
      })
    return
  }

  getDb()
    .insert(vendorMappings)
    .values(values)
    .onConflictDoUpdate({
      target: vendorMappings.vendor,
      set: {
        mappingsJson: values.mappingsJson,
        metadataMappingsJson: values.metadataMappingsJson,
        exportedAt: values.exportedAt,
        syncedAt: values.syncedAt,
      },
    })
    .run()
}

export async function selectVendorMappingByVendor(
  vendor: string,
): Promise<typeof vendorMappings.$inferSelect | undefined> {
  if (isPostgres()) {
    const rows = await pgDb()
      .select()
      .from(vendorMappings)
      .where(eq(vendorMappings.vendor, vendor))
      .limit(1)

    return rows[0]
  }

  return getDb().select().from(vendorMappings).where(eq(vendorMappings.vendor, vendor)).get()
}

export async function deleteAllVendorMappings(): Promise<void> {
  if (isPostgres()) {
    await pgDb().delete(vendorMappings)
    return
  }

  getDb().delete(vendorMappings).run()
}

export async function countPendingIngestionRows(): Promise<number> {
  if (isPostgres()) {
    const rows = await pgDb()
      .select()
      .from(webhookIngestions)
      .where(eq(webhookIngestions.status, 'pending'))

    return rows.length
  }

  return getDb()
    .select()
    .from(webhookIngestions)
    .where(eq(webhookIngestions.status, 'pending'))
    .all().length
}

export async function insertMappingAuditLog(
  values: typeof import('./schema.js').mappingAuditLog.$inferInsert,
): Promise<void> {
  const { mappingAuditLog } = await import('./schema.js')

  if (isPostgres()) {
    await pgDb().insert(mappingAuditLog).values(values)
    return
  }

  getDb().insert(mappingAuditLog).values(values).run()
}
