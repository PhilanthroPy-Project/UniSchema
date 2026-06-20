import { randomUUID } from 'node:crypto'

import { and, eq, lt } from 'drizzle-orm'
import type { ZodError } from 'zod'

import { getDb } from '../db/client.js'
import { webhookIngestions } from '../db/schema.js'
import type { ConstituentEvent } from '../schema/master.js'
import type { DriftVendor } from '../utils/driftCapture.js'

export type IngestionStatus = 'pending' | 'completed' | 'failed'

export type IngestionRecord = {
  id: string
  vendor: DriftVendor
  rawPayload: unknown
  status: IngestionStatus
  result?: ConstituentEvent
  error?: {
    message: string
    errors?: ReturnType<ZodError['flatten']>
  }
  createdAt: string
  completedAt?: string
}

export function createIngestion(vendor: DriftVendor, rawPayload: unknown): IngestionRecord {
  const id = randomUUID()
  const createdAt = new Date().toISOString()

  getDb()
    .insert(webhookIngestions)
    .values({
      id,
      vendor,
      rawPayloadJson: JSON.stringify(rawPayload),
      status: 'pending',
      createdAt,
    })
    .run()

  return {
    id,
    vendor,
    rawPayload,
    status: 'pending',
    createdAt,
  }
}

export function getIngestion(id: string): IngestionRecord | undefined {
  const row = getDb().select().from(webhookIngestions).where(eq(webhookIngestions.id, id)).get()

  if (!row) {
    return undefined
  }

  return toIngestionRecord(row)
}

/** Returns pending ingestions older than the given threshold (default: 5 minutes). */
export function listStalePendingIngestions(
  olderThanMs = 5 * 60 * 1000,
): IngestionRecord[] {
  const threshold = new Date(Date.now() - olderThanMs).toISOString()

  const rows = getDb()
    .select()
    .from(webhookIngestions)
    .where(and(eq(webhookIngestions.status, 'pending'), lt(webhookIngestions.createdAt, threshold)))
    .all()

  return rows.map(toIngestionRecord)
}

export function completeIngestion(id: string, result: ConstituentEvent): void {
  getDb()
    .update(webhookIngestions)
    .set({
      status: 'completed',
      resultJson: JSON.stringify(result),
      completedAt: new Date().toISOString(),
    })
    .where(eq(webhookIngestions.id, id))
    .run()
}

export function failIngestion(
  id: string,
  error: { message: string; errors?: ReturnType<ZodError['flatten']> },
): void {
  getDb()
    .update(webhookIngestions)
    .set({
      status: 'failed',
      errorJson: JSON.stringify(error),
      completedAt: new Date().toISOString(),
    })
    .where(eq(webhookIngestions.id, id))
    .run()
}

function toIngestionRecord(row: typeof webhookIngestions.$inferSelect): IngestionRecord {
  return {
    id: row.id,
    vendor: row.vendor as DriftVendor,
    rawPayload: JSON.parse(row.rawPayloadJson) as unknown,
    status: row.status as IngestionStatus,
    result: row.resultJson ? (JSON.parse(row.resultJson) as ConstituentEvent) : undefined,
    error: row.errorJson
      ? (JSON.parse(row.errorJson) as IngestionRecord['error'])
      : undefined,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  }
}

/** Test-only helper — clears ingestion rows between test cases. */
export function clearIngestions(): void {
  getDb().delete(webhookIngestions).run()
}
