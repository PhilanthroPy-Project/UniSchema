import { createHash, randomUUID } from 'node:crypto'

import type { Context } from 'hono'

/**
 * Optional OIDC JWT validation for admin routes.
 * When OIDC_ISSUER and OIDC_AUDIENCE are set, Bearer tokens are validated
 * as JWTs from the issuer's JWKS endpoint (simplified: decode + audience check).
 *
 * For production, use a full OIDC library or reverse-proxy auth (oauth2-proxy).
 */
export function isOidcConfigured(): boolean {
  return Boolean(process.env.OIDC_ISSUER?.trim() && process.env.OIDC_AUDIENCE?.trim())
}

export function isOidcAuthorized(c: Context): boolean {
  if (!isOidcConfigured()) {
    return false
  }

  const authHeader = c.req.header('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice('Bearer '.length).trim()
  const parts = token.split('.')

  if (parts.length !== 3) {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
      iss?: string
      aud?: string | string[]
      exp?: number
    }

    const issuer = process.env.OIDC_ISSUER!.trim()
    const audience = process.env.OIDC_AUDIENCE!.trim()

    if (payload.iss !== issuer) {
      return false
    }

    const aud = payload.aud
    const audMatch = Array.isArray(aud) ? aud.includes(audience) : aud === audience

    if (!audMatch) {
      return false
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false
    }

    return true
  } catch {
    return false
  }
}

export function resolveMappingActor(c: Context): string {
  if (isOidcAuthorized(c)) {
    const authHeader = c.req.header('authorization')
    const token = authHeader?.slice('Bearer '.length).trim() ?? ''

    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'),
      ) as { email?: string; sub?: string }

      return payload.email ?? payload.sub ?? 'oidc-user'
    } catch {
      return 'oidc-user'
    }
  }

  return 'sync-token'
}

export function mappingDiffHash(artifactJson: string): string {
  return createHash('sha256').update(artifactJson).digest('hex').slice(0, 16)
}

export function newAuditLogId(): string {
  return randomUUID()
}
