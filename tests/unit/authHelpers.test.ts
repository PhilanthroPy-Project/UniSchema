import { afterEach, describe, expect, it } from 'vitest'
import { Hono } from 'hono'

import { isDriftListAuthorized, resolveDriftListAuth } from '../../src/utils/driftAgentAuth.js'
import { isMappingSyncAuthorized, resolveMappingSyncAuth } from '../../src/utils/mappingSyncAuth.js'

describe('resolveDriftListAuth', () => {
  const originalToken = process.env.DRIFT_AGENT_TOKEN
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.DRIFT_AGENT_TOKEN
    } else {
      process.env.DRIFT_AGENT_TOKEN = originalToken
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('requires a token in production when DRIFT_AGENT_TOKEN is unset', () => {
    delete process.env.DRIFT_AGENT_TOKEN
    process.env.NODE_ENV = 'production'

    expect(resolveDriftListAuth()).toEqual({ action: 'misconfigured' })
  })

  it('returns false for drift list authorization when misconfigured', async () => {
    delete process.env.DRIFT_AGENT_TOKEN
    process.env.NODE_ENV = 'production'

    const app = new Hono()
    app.get('/drift-auth', (c) => c.json({ authorized: isDriftListAuthorized(c) }))

    const response = await app.request('/drift-auth')
    expect((await response.json()) as { authorized: boolean }).toEqual({ authorized: false })
  })
})

describe('resolveMappingSyncAuth helpers', () => {
  const originalToken = process.env.MAPPING_SYNC_TOKEN
  const originalRequired = process.env.MAPPING_SYNC_REQUIRED

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.MAPPING_SYNC_TOKEN
    } else {
      process.env.MAPPING_SYNC_TOKEN = originalToken
    }

    if (originalRequired === undefined) {
      delete process.env.MAPPING_SYNC_REQUIRED
    } else {
      process.env.MAPPING_SYNC_REQUIRED = originalRequired
    }
  })

  it('returns false for mapping sync authorization when misconfigured', async () => {
    delete process.env.MAPPING_SYNC_TOKEN
    process.env.MAPPING_SYNC_REQUIRED = 'true'

    expect(resolveMappingSyncAuth()).toEqual({ action: 'misconfigured' })

    const app = new Hono()
    app.get('/mapping-auth', (c) => c.json({ authorized: isMappingSyncAuthorized(c) }))

    const response = await app.request('/mapping-auth')
    expect((await response.json()) as { authorized: boolean }).toEqual({ authorized: false })
  })
})
