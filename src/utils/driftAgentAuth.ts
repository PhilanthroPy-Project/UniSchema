import { createHmac, timingSafeEqual } from 'node:crypto'

import type { Context } from 'hono'

export type DriftListAuthDecision =
  | { action: 'allow' }
  | { action: 'verify'; token: string }
  | { action: 'misconfigured' }

function isDriftListRequired(): boolean {
  return process.env.NODE_ENV === 'production'
}

/** Determines whether drift list endpoints require Bearer auth (fail-closed in production). */
export function resolveDriftListAuth(): DriftListAuthDecision {
  const token = process.env.DRIFT_AGENT_TOKEN

  if (token) {
    return { action: 'verify', token }
  }

  if (isDriftListRequired()) {
    return { action: 'misconfigured' }
  }

  return { action: 'allow' }
}

export function isDriftListAuthorized(c: Context): boolean {
  const decision = resolveDriftListAuth()

  if (decision.action === 'allow') {
    return true
  }

  if (decision.action === 'misconfigured') {
    return false
  }

  const authHeader = c.req.header('Authorization') ?? ''
  const expected = `Bearer ${decision.token}`

  if (authHeader.length !== expected.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
}

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
