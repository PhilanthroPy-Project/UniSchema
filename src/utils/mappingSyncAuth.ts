import { timingSafeEqual } from 'node:crypto'

import type { Context } from 'hono'

/** Returns true when mapping sync is open (no token configured). */
export function isMappingSyncOpen(): boolean {
  return !process.env.MAPPING_SYNC_TOKEN
}

export function isMappingSyncAuthorized(c: Context): boolean {
  const token = process.env.MAPPING_SYNC_TOKEN

  if (!token) {
    return true
  }

  const authHeader = c.req.header('Authorization') ?? ''
  const expected = `Bearer ${token}`

  if (authHeader.length !== expected.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
}
