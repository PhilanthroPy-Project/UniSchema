import { afterEach, describe, expect, it } from 'vitest'
import { Hono } from 'hono'

import { isOidcConfigured, isOidcAuthorized } from '../../src/utils/oidcAuth.js'

describe('oidcAuth', () => {
  const originalIssuer = process.env.OIDC_ISSUER
  const originalAudience = process.env.OIDC_AUDIENCE

  afterEach(() => {
    if (originalIssuer === undefined) {
      delete process.env.OIDC_ISSUER
    } else {
      process.env.OIDC_ISSUER = originalIssuer
    }

    if (originalAudience === undefined) {
      delete process.env.OIDC_AUDIENCE
    } else {
      process.env.OIDC_AUDIENCE = originalAudience
    }
  })

  it('reports not configured when issuer or audience is missing', () => {
    delete process.env.OIDC_ISSUER
    delete process.env.OIDC_AUDIENCE

    expect(isOidcConfigured()).toBe(false)
  })

  it('reports configured when issuer and audience are set', () => {
    process.env.OIDC_ISSUER = 'https://issuer.example.com'
    process.env.OIDC_AUDIENCE = 'unischema-admin'

    expect(isOidcConfigured()).toBe(true)
  })

  it('rejects requests without bearer token', async () => {
    process.env.OIDC_ISSUER = 'https://issuer.example.com'
    process.env.OIDC_AUDIENCE = 'unischema-admin'

    const app = new Hono()
    app.get('/protected', async (c) => c.json({ authorized: await isOidcAuthorized(c) }))

    const response = await app.request('/protected')
    expect((await response.json()) as { authorized: boolean }).toEqual({ authorized: false })
  })

  it('rejects malformed bearer tokens without initialized JWKS', async () => {
    process.env.OIDC_ISSUER = 'https://issuer.example.com'
    process.env.OIDC_AUDIENCE = 'unischema-admin'

    const app = new Hono()
    app.get('/protected', async (c) =>
      c.json({ authorized: await isOidcAuthorized(c) }),
    )

    const response = await app.request('/protected', {
      headers: { Authorization: 'Bearer not-a-jwt' },
    })

    expect((await response.json()) as { authorized: boolean }).toEqual({ authorized: false })
  })
})
