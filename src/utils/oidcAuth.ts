import { createHash, randomUUID } from 'node:crypto'

import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import type { Context } from 'hono'

let jwks: JWTVerifyGetKey | undefined

/**
 * Optional OIDC JWT validation for admin routes (JWKS signature verification).
 */
export function isOidcConfigured(): boolean {
  return Boolean(process.env.OIDC_ISSUER?.trim() && process.env.OIDC_AUDIENCE?.trim())
}

export async function initOidcJwks(): Promise<void> {
  if (!isOidcConfigured()) {
    jwks = undefined
    return
  }

  const issuer = process.env.OIDC_ISSUER!.trim().replace(/\/$/, '')
  const jwksUri = process.env.OIDC_JWKS_URI?.trim() ?? `${issuer}/.well-known/jwks.json`
  jwks = createRemoteJWKSet(new URL(jwksUri))
}

async function verifyBearerToken(token: string): Promise<boolean> {
  if (!isOidcConfigured() || !jwks) {
    return false
  }

  try {
    await jwtVerify(token, jwks, {
      issuer: process.env.OIDC_ISSUER!.trim(),
      audience: process.env.OIDC_AUDIENCE!.trim(),
    })

    return true
  } catch {
    return false
  }
}

function extractBearerToken(c: Context): string | undefined {
  const authHeader = c.req.header('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return undefined
  }

  return authHeader.slice('Bearer '.length).trim()
}

export async function isOidcAuthorized(c: Context): Promise<boolean> {
  const token = extractBearerToken(c)

  if (!token) {
    return false
  }

  return verifyBearerToken(token)
}

export async function resolveMappingActor(c: Context): Promise<string> {
  const token = extractBearerToken(c)

  if (token && (await verifyBearerToken(token))) {
    try {
      const payloadPart = token.split('.')[1]
      if (!payloadPart) {
        return 'oidc-user'
      }

      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
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
