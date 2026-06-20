import type { EgressEventRecord } from '../store/egressStore.js'

/** Builds a deterministic, date-partitioned object key for a ConstituentEvent. */
export function buildEgressObjectKey(record: EgressEventRecord, prefix: string): string {
  const createdAt = new Date(record.createdAt)
  const year = createdAt.getUTCFullYear()
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(createdAt.getUTCDate()).padStart(2, '0')
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '')

  return `${normalizedPrefix}/${record.vendor}/${year}/${month}/${day}/${record.eventId}.json`
}
