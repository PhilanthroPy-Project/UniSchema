import { randomUUID } from 'node:crypto'

import { eq, inArray } from 'drizzle-orm'

import { getDb } from '../db/client.js'
import { constituentEvents } from '../db/schema.js'
import type { ConstituentEvent } from '../schema/master.js'

export type EgressEventRecord = {
  id: string
  eventId: string
  vendor: string
  event: ConstituentEvent
  egressStatus: 'pending' | 'exported'
  createdAt: string
  exportedAt?: string
}

export function persistConstituentEvent(
  event: ConstituentEvent,
  vendor: string,
): EgressEventRecord {
  const normalizedVendor = vendor.trim().toLowerCase()
  const existing = getDb()
    .select()
    .from(constituentEvents)
    .where(eq(constituentEvents.eventId, event.eventId))
    .get()

  if (existing) {
    return toEgressRecord(existing)
  }

  const id = randomUUID()
  const createdAt = new Date().toISOString()

  getDb()
    .insert(constituentEvents)
    .values({
      id,
      eventId: event.eventId,
      vendor: normalizedVendor,
      eventJson: JSON.stringify(event),
      egressStatus: 'pending',
      createdAt,
    })
    .run()

  return {
    id,
    eventId: event.eventId,
    vendor: normalizedVendor,
    event,
    egressStatus: 'pending',
    createdAt,
  }
}

export function listPendingEgressEvents(limit = 100): EgressEventRecord[] {
  const rows = getDb()
    .select()
    .from(constituentEvents)
    .where(eq(constituentEvents.egressStatus, 'pending'))
    .limit(limit)
    .all()

  return rows.map(toEgressRecord)
}

export function acknowledgeEgressEvents(ids: string[]): number {
  if (ids.length === 0) {
    return 0
  }

  const exportedAt = new Date().toISOString()
  const result = getDb()
    .update(constituentEvents)
    .set({ egressStatus: 'exported', exportedAt })
    .where(inArray(constituentEvents.id, ids))
    .run()

  return result.changes
}

function toEgressRecord(row: typeof constituentEvents.$inferSelect): EgressEventRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    vendor: row.vendor,
    event: JSON.parse(row.eventJson) as ConstituentEvent,
    egressStatus: row.egressStatus as EgressEventRecord['egressStatus'],
    createdAt: row.createdAt,
    exportedAt: row.exportedAt ?? undefined,
  }
}

/** Test-only helper — clears egress staging rows between test cases. */
export function clearEgressEvents(): void {
  getDb().delete(constituentEvents).run()
}
