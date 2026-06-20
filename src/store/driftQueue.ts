import { randomUUID } from 'node:crypto'

import type { ZodError } from 'zod'

import {
  deleteAllDriftEvents,
  insertDriftEvent,
  listDriftEventRows,
  markDriftEventProcessedRow,
  selectDriftEventById,
} from '../db/unified.js'
import type { MappingArtifact } from '../schema/mapping.js'
import type { DriftVendor } from '../utils/driftCapture.js'

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
  })

  return {
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
  }
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

export async function markDriftEventProcessed(id: string): Promise<boolean> {
  const changes = await markDriftEventProcessedRow(id)
  return changes > 0
}

export async function clearDriftQueue(): Promise<void> {
  await deleteAllDriftEvents()
}
