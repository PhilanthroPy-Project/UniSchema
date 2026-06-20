import { createHmac, timingSafeEqual } from 'node:crypto'

import type { Context } from 'hono'

export function isDriftAgentAuthorized(c: Context): boolean {
  const token = process.env.DRIFT_AGENT_TOKEN

  if (!token) {
    return false
  }

  const authHeader = c.req.header('Authorization') ?? ''
  const expected = `Bearer ${token}`

  if (authHeader.length !== expected.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
}

export function verifyDriftAgentSignature(body: string, signatureHeader: string | undefined): boolean {
  const secret = process.env.DRIFT_AGENT_TOKEN

  if (!secret || !signatureHeader) {
    return false
  }

  const expected = createHmac('sha256', secret).update(body).digest('hex')

  if (signatureHeader.length !== expected.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
}
