import { randomUUID } from 'node:crypto'

import { and, eq, lt, or } from 'drizzle-orm'
import type { ZodError } from 'zod'

import { getDb } from '../db/client.js'
import { webhookIngestions } from '../db/schema.js'
import type { ConstituentEvent } from '../schema/master.js'
import type { DriftVendor } from '../utils/driftCapture.js'

export type IngestionStatus = 'pending' | 'processing' | 'completed' | 'failed'

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

/**
 * Atomically claims a pending ingestion for background processing.
 * Returns undefined when another worker already claimed or finished the row.
 */
export function tryClaimIngestion(id: string): IngestionRecord | undefined {
  const result = getDb()
    .update(webhookIngestions)
    .set({ status: 'processing' })
    .where(and(eq(webhookIngestions.id, id), eq(webhookIngestions.status, 'pending')))
    .run()

  if (result.changes === 0) {
    return undefined
  }

  return getIngestion(id)
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

/** Resets stale `processing` rows back to `pending` for crash recovery. */
export function releaseStaleProcessingIngestions(olderThanMs = 5 * 60 * 1000): number {
  const threshold = new Date(Date.now() - olderThanMs).toISOString()

  const result = getDb()
    .update(webhookIngestions)
    .set({ status: 'pending' })
    .where(
      and(eq(webhookIngestions.status, 'processing'), lt(webhookIngestions.createdAt, threshold)),
    )
    .run()

  return result.changes
}

export function completeIngestion(id: string, result: ConstituentEvent): void {
  getDb()
    .update(webhookIngestions)
    .set({
      status: 'completed',
      resultJson: JSON.stringify(result),
      completedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(webhookIngestions.id, id),
        or(eq(webhookIngestions.status, 'processing'), eq(webhookIngestions.status, 'pending')),
      ),
    )
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
    .where(
      and(
        eq(webhookIngestions.id, id),
        or(eq(webhookIngestions.status, 'processing'), eq(webhookIngestions.status, 'pending')),
      ),
    )
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
