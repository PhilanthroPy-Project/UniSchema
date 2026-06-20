import { timingSafeEqual } from 'node:crypto'

import type { Context } from 'hono'

export type EgressPullAuthDecision =
  | { action: 'allow' }
  | { action: 'verify'; token: string }
  | { action: 'misconfigured' }

function isEgressPullRequired(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.EGRESS_PULL_REQUIRED === 'true'
  )
}

/** Determines whether legacy pull-based egress endpoints require Bearer auth. */
export function resolveEgressPullAuth(): EgressPullAuthDecision {
  const token = process.env.EGRESS_PULL_TOKEN

  if (token) {
    return { action: 'verify', token }
  }

  if (isEgressPullRequired()) {
    return { action: 'misconfigured' }
  }

  return { action: 'allow' }
}

export function isEgressPullAuthorized(c: Context): boolean {
  const decision = resolveEgressPullAuth()

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
