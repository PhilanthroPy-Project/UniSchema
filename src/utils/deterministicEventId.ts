import { createHash } from 'node:crypto'

/**
 * Derives a stable RFC-4122 UUID (version 5 semantics) from a vendor identifier.
 * Retries of the same vendor payload always produce the same eventId.
 */
export function deterministicEventId(
  sourceSystem: string,
  vendorUniqueId: string,
): string {
  const digest = createHash('sha256')
    .update(`unischema:${sourceSystem}:${vendorUniqueId}`)
    .digest()

  const bytes = Buffer.from(digest.subarray(0, 16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80

  const hex = bytes.toString('hex')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
