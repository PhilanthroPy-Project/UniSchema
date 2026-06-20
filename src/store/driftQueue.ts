import { randomUUID } from 'node:crypto'

import { desc, eq } from 'drizzle-orm'
import type { ZodError } from 'zod'

import { getDb } from '../db/client.js'
import { driftEvents } from '../db/schema.js'
import type { DriftVendor } from '../utils/driftCapture.js'

export type DriftEventRecord = {
  id: string
  vendor: DriftVendor
  rawPayload: unknown
  validationErrors: ReturnType<ZodError['flatten']>
  capturedAt: string
  status: 'pending' | 'processed'
  localFixturePath?: string
  localTestPath?: string
}

export function enqueueDriftEvent(
  vendor: DriftVendor,
  rawPayload: unknown,
  validationError: ZodError,
  localPaths?: { fixturePath?: string; testPath?: string },
): DriftEventRecord {
  const id = randomUUID()
  const capturedAt = new Date().toISOString()

  getDb()
    .insert(driftEvents)
    .values({
      id,
      vendor,
      rawPayloadJson: JSON.stringify(rawPayload),
      validationErrorsJson: JSON.stringify(validationError.flatten()),
      capturedAt,
      status: 'pending',
      localFixturePath: localPaths?.fixturePath,
      localTestPath: localPaths?.testPath,
    })
    .run()

  return {
    id,
    vendor,
    rawPayload,
    validationErrors: validationError.flatten(),
    capturedAt,
    status: 'pending',
    localFixturePath: localPaths?.fixturePath,
    localTestPath: localPaths?.testPath,
  }
}

export function listDriftEvents(vendor?: DriftVendor, limit = 50): DriftEventRecord[] {
  const query = getDb().select().from(driftEvents).orderBy(desc(driftEvents.capturedAt)).limit(limit)

  const rows = vendor
    ? query.where(eq(driftEvents.vendor, vendor)).all()
    : query.all()

  return rows.map((row) => ({
    id: row.id,
    vendor: row.vendor as DriftVendor,
    rawPayload: JSON.parse(row.rawPayloadJson) as unknown,
    validationErrors: JSON.parse(row.validationErrorsJson) as ReturnType<ZodError['flatten']>,
    capturedAt: row.capturedAt,
    status: row.status as DriftEventRecord['status'],
    localFixturePath: row.localFixturePath ?? undefined,
    localTestPath: row.localTestPath ?? undefined,
  }))
}

/** Test-only helper — clears drift queue rows between test cases. */
export function clearDriftQueue(): void {
  getDb().delete(driftEvents).run()
}
