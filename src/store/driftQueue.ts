import { randomUUID } from 'node:crypto'

import { and, desc, eq } from 'drizzle-orm'
import type { ZodError } from 'zod'

import { getDb } from '../db/client.js'
import { driftEvents } from '../db/schema.js'
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

function mapDriftRow(row: typeof driftEvents.$inferSelect): DriftEventRecord {
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

export function enqueueDriftEvent(
  vendor: DriftVendor,
  rawPayload: unknown,
  validationError: ZodError,
  options?: {
    localPaths?: { fixturePath?: string; testPath?: string }
    mapperKind?: DriftMapperKind
    mappingArtifact?: MappingArtifact
  },
): DriftEventRecord {
  const id = randomUUID()
  const capturedAt = new Date().toISOString()
  const mapperKind = options?.mapperKind ?? 'builtin'

  getDb()
    .insert(driftEvents)
    .values({
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
    .run()

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

export function getDriftEvent(id: string): DriftEventRecord | undefined {
  const row = getDb().select().from(driftEvents).where(eq(driftEvents.id, id)).get()

  return row ? mapDriftRow(row) : undefined
}

export function listDriftEvents(
  vendor?: DriftVendor,
  limit = 50,
  status?: DriftEventRecord['status'],
): DriftEventRecord[] {
  const filters = []

  if (vendor) {
    filters.push(eq(driftEvents.vendor, vendor))
  }

  if (status) {
    filters.push(eq(driftEvents.status, status))
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined

  const rows = getDb()
    .select()
    .from(driftEvents)
    .where(whereClause)
    .orderBy(desc(driftEvents.capturedAt))
    .limit(limit)
    .all()

  return rows.map(mapDriftRow)
}

export function listPendingDriftEvents(limit = 50): DriftEventRecord[] {
  const rows = getDb()
    .select()
    .from(driftEvents)
    .where(eq(driftEvents.status, 'pending'))
    .orderBy(desc(driftEvents.capturedAt))
    .limit(limit)
    .all()

  return rows.map(mapDriftRow)
}

export function markDriftEventProcessed(id: string): boolean {
  const result = getDb()
    .update(driftEvents)
    .set({ status: 'processed' })
    .where(eq(driftEvents.id, id))
    .run()

  return result.changes > 0
}

/** Test-only helper — clears drift queue rows between test cases. */
export function clearDriftQueue(): void {
  getDb().delete(driftEvents).run()
}
