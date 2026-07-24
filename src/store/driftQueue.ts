import { createHash, randomUUID } from 'node:crypto'

import type { ZodError } from 'zod'

import {
  countDriftEventRows,
  countPendingDriftBySignature,
  deleteAllDriftEvents,
  insertDriftEvent,
  listDriftEventRows,
  markDriftEventProcessedRow,
  selectDriftEventById,
} from '../db/unified.js'
import { resolveEgressConfig } from '../egress/config.js'
import { notifyDriftDetected } from '../egress/driftNotifier.js'
import type { MappingArtifact } from '../schema/mapping.js'
import type { DriftVendor } from '../utils/driftCapture.js'
import { logError } from '../utils/logger.js'

/**
 * Structural fingerprint of a drift event: vendor + the sorted set of failing
 * field paths and error codes. Payloads that break the same way collapse to one
 * signature so a single bad vendor deploy is one incident, not thousands of
 * alerts. See docs/ai-agent-loop.md for the alert-fatigue framing.
 */
export function computeDriftSignature(vendor: string, validationError: ZodError): string {
  const shape = validationError.issues
    .map((issue) => `${issue.path.join('.')}:${issue.code}`)
    .sort()
    .join('|')

  return createHash('sha256').update(`${vendor}\n${shape}`).digest('hex').slice(0, 16)
}

export type DriftMapperKind = 'builtin' | 'dynamic'

export type DriftEventRecord = {
  id: string
  vendor: DriftVendor
  rawPayload: unknown
  validationErrors: ReturnType<ZodError['flatten']>
  capturedAt: string
  status: 'pending' | 'processed'
  mapperKind: DriftMapperKind
  mappingArtifact?: MappingArtifact
  localFixturePath?: string
  localTestPath?: string
  signature?: string
  processedAt?: string
  resolution?: string
}

function mapDriftRow(row: {
  id: string
  vendor: string
  rawPayloadJson: string
  validationErrorsJson: string
  capturedAt: string
  status: string
  mapperKind: string | null
  mappingArtifactJson: string | null
  localFixturePath: string | null
  localTestPath: string | null
  signature: string | null
  processedAt: string | null
  resolution: string | null
}): DriftEventRecord {
  return {
    id: row.id,
    vendor: row.vendor as DriftVendor,
    rawPayload: JSON.parse(row.rawPayloadJson) as unknown,
    validationErrors: JSON.parse(row.validationErrorsJson) as ReturnType<ZodError['flatten']>,
    capturedAt: row.capturedAt,
    status: row.status as DriftEventRecord['status'],
    mapperKind: (row.mapperKind as DriftMapperKind | null) ?? 'builtin',
    mappingArtifact: row.mappingArtifactJson
      ? (JSON.parse(row.mappingArtifactJson) as MappingArtifact)
      : undefined,
    localFixturePath: row.localFixturePath ?? undefined,
    localTestPath: row.localTestPath ?? undefined,
    signature: row.signature ?? undefined,
    processedAt: row.processedAt ?? undefined,
    resolution: row.resolution ?? undefined,
  }
}

export async function enqueueDriftEvent(
  vendor: DriftVendor,
  rawPayload: unknown,
  validationError: ZodError,
  options?: {
    localPaths?: { fixturePath?: string; testPath?: string }
    mapperKind?: DriftMapperKind
    mappingArtifact?: MappingArtifact
  },
): Promise<DriftEventRecord> {
  const id = randomUUID()
  const capturedAt = new Date().toISOString()
  const mapperKind = options?.mapperKind ?? 'builtin'
  const signature = computeDriftSignature(vendor, validationError)
  const priorForSignature = await countPendingDriftBySignature(signature)

  await insertDriftEvent({
    id,
    vendor,
    rawPayloadJson: JSON.stringify(rawPayload),
    validationErrorsJson: JSON.stringify(validationError.flatten()),
    capturedAt,
    status: 'pending',
    localFixturePath: options?.localPaths?.fixturePath,
    localTestPath: options?.localPaths?.testPath,
    mapperKind,
    mappingArtifactJson: options?.mappingArtifact
      ? JSON.stringify(options.mappingArtifact)
      : undefined,
    signature,
  })

  const record: DriftEventRecord = {
    id,
    vendor,
    rawPayload,
    validationErrors: validationError.flatten(),
    capturedAt,
    status: 'pending',
    mapperKind,
    mappingArtifact: options?.mappingArtifact,
    localFixturePath: options?.localPaths?.fixturePath,
    localTestPath: options?.localPaths?.testPath,
    signature,
  }

  // Fire once per new signature so a burst of identical failures is one alert,
  // not thousands. No-op unless DRIFT_WEBHOOK_URL is configured.
  if (priorForSignature === 0) {
    void notifyDriftDetected(record, resolveEgressConfig()).catch((error) => {
      logError('[drift] incident notify failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  return record
}

export async function getDriftEvent(id: string): Promise<DriftEventRecord | undefined> {
  const row = await selectDriftEventById(id)

  return row ? mapDriftRow(row) : undefined
}

export async function listDriftEvents(
  vendor?: DriftVendor,
  limit = 50,
  status?: DriftEventRecord['status'],
): Promise<DriftEventRecord[]> {
  const rows = await listDriftEventRows(vendor, limit, status)

  return rows.map(mapDriftRow)
}

export async function listPendingDriftEvents(limit = 50): Promise<DriftEventRecord[]> {
  return listDriftEvents(undefined, limit, 'pending')
}

export async function markDriftEventProcessed(id: string, resolution?: string): Promise<boolean> {
  const processedAt = new Date().toISOString()
  const changes = await markDriftEventProcessedRow(id, processedAt, resolution)
  return changes > 0
}

export async function countDriftEvents(status?: DriftEventRecord['status']): Promise<number> {
  return countDriftEventRows(status)
}

export async function clearDriftQueue(): Promise<void> {
  await deleteAllDriftEvents()
}
