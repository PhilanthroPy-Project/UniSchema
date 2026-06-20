import { randomUUID } from 'node:crypto'

import {
  acknowledgeConstituentEvents,
  deleteAllConstituentEvents,
  insertConstituentEvent,
  listPendingConstituentEventRows,
  selectConstituentEventByEventId,
} from '../db/unified.js'
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

export async function persistConstituentEvent(
  event: ConstituentEvent,
  vendor: string,
): Promise<EgressEventRecord> {
  const normalizedVendor = vendor.trim().toLowerCase()
  const existing = await selectConstituentEventByEventId(event.eventId)

  if (existing) {
    return toEgressRecord(existing)
  }

  const id = randomUUID()
  const createdAt = new Date().toISOString()

  const inserted = await insertConstituentEvent({
    id,
    eventId: event.eventId,
    vendor: normalizedVendor,
    eventJson: JSON.stringify(event),
    egressStatus: 'pending',
    createdAt,
  })

  if (!inserted) {
    const raced = await selectConstituentEventByEventId(event.eventId)

    if (raced) {
      return toEgressRecord(raced)
    }
  }

  return {
    id,
    eventId: event.eventId,
    vendor: normalizedVendor,
    event,
    egressStatus: 'pending',
    createdAt,
  }
}

export async function listPendingEgressEvents(limit = 100): Promise<EgressEventRecord[]> {
  const rows = await listPendingConstituentEventRows(limit)

  return rows.map(toEgressRecord)
}

export async function acknowledgeEgressEvents(ids: string[]): Promise<number> {
  if (ids.length === 0) {
    return 0
  }

  return acknowledgeConstituentEvents(ids, new Date().toISOString())
}

function toEgressRecord(row: {
  id: string
  eventId: string
  vendor: string
  eventJson: string
  egressStatus: string
  createdAt: string
  exportedAt: string | null
}): EgressEventRecord {
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

export async function clearEgressEvents(): Promise<void> {
  await deleteAllConstituentEvents()
}
