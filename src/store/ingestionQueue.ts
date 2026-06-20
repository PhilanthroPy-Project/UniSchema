import { randomUUID } from 'node:crypto'

import type { ZodError } from 'zod'

import {
  claimWebhookIngestion,
  completeWebhookIngestion,
  deleteAllWebhookIngestions,
  failWebhookIngestion,
  insertWebhookIngestion,
  listStaleWebhookIngestions,
  releaseStaleProcessingIngestionRows,
  selectWebhookIngestionById,
} from '../db/unified.js'
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

export async function createIngestion(
  vendor: DriftVendor,
  rawPayload: unknown,
): Promise<IngestionRecord> {
  const id = randomUUID()
  const createdAt = new Date().toISOString()

  await insertWebhookIngestion({
    id,
    vendor,
    rawPayloadJson: JSON.stringify(rawPayload),
    status: 'pending',
    createdAt,
  })

  return {
    id,
    vendor,
    rawPayload,
    status: 'pending',
    createdAt,
  }
}

export async function getIngestion(id: string): Promise<IngestionRecord | undefined> {
  const row = await selectWebhookIngestionById(id)

  if (!row) {
    return undefined
  }

  return toIngestionRecord(row)
}

export async function tryClaimIngestion(id: string): Promise<IngestionRecord | undefined> {
  const changes = await claimWebhookIngestion(id)

  if (changes === 0) {
    return undefined
  }

  return getIngestion(id)
}

export async function listStalePendingIngestions(
  olderThanMs = 5 * 60 * 1000,
): Promise<IngestionRecord[]> {
  const threshold = new Date(Date.now() - olderThanMs).toISOString()
  const rows = await listStaleWebhookIngestions(threshold)

  return rows.map(toIngestionRecord)
}

export async function releaseStaleProcessingIngestions(olderThanMs = 5 * 60 * 1000): Promise<number> {
  const threshold = new Date(Date.now() - olderThanMs).toISOString()
  return releaseStaleProcessingIngestionRows(threshold)
}

export async function completeIngestion(id: string, result: ConstituentEvent): Promise<void> {
  await completeWebhookIngestion(id, JSON.stringify(result), new Date().toISOString())
}

export async function failIngestion(
  id: string,
  error: { message: string; errors?: ReturnType<ZodError['flatten']> },
): Promise<void> {
  await failWebhookIngestion(id, JSON.stringify(error), new Date().toISOString())
}

function toIngestionRecord(row: {
  id: string
  vendor: string
  rawPayloadJson: string
  status: string
  resultJson: string | null
  errorJson: string | null
  createdAt: string
  completedAt: string | null
}): IngestionRecord {
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

export async function clearIngestions(): Promise<void> {
  await deleteAllWebhookIngestions()
}
