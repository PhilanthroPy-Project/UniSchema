import { timingSafeEqual } from 'node:crypto'

import type { Context } from 'hono'

import { isOidcAuthorized } from './oidcAuth.js'

export type MappingSyncAuthDecision =
  | { action: 'allow' }
  | { action: 'verify'; token: string }
  | { action: 'misconfigured' }

function isMappingSyncRequired(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.MAPPING_SYNC_REQUIRED === 'true'
  )
}

/** Determines whether mapping sync requires Bearer auth (fail-closed in production). */
export function resolveMappingSyncAuth(): MappingSyncAuthDecision {
  const token = process.env.MAPPING_SYNC_TOKEN

  if (token) {
    return { action: 'verify', token }
  }

  if (isMappingSyncRequired()) {
    return { action: 'misconfigured' }
  }

  return { action: 'allow' }
}

export async function isMappingSyncAuthorized(c: Context): Promise<boolean> {
  if (await isOidcAuthorized(c)) {
    return true
  }

  const decision = resolveMappingSyncAuth()

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

/** True only when a valid Bearer mapping sync or OIDC token is present (not dev allow mode). */
export async function hasVerifiedAdminAuth(c: Context): Promise<boolean> {
  if (await isOidcAuthorized(c)) {
    return true
  }

  const decision = resolveMappingSyncAuth()

  if (decision.action !== 'verify') {
    return false
  }

  const authHeader = c.req.header('Authorization') ?? ''
  const expected = `Bearer ${decision.token}`

  if (authHeader.length !== expected.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
}
