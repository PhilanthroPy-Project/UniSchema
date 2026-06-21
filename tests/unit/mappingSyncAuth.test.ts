import { afterEach, describe, expect, it } from 'vitest'

import { hasVerifiedAdminAuth } from '../../src/utils/mappingSyncAuth.js'

describe('hasVerifiedAdminAuth', () => {
  const originalToken = process.env.MAPPING_SYNC_TOKEN

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.MAPPING_SYNC_TOKEN
    } else {
      process.env.MAPPING_SYNC_TOKEN = originalToken
    }
  })

  it('returns false in dev allow mode without a bearer token', async () => {
    delete process.env.MAPPING_SYNC_TOKEN

    const context = {
      req: { header: () => undefined },
    } as never

    expect(await hasVerifiedAdminAuth(context)).toBe(false)
  })

  it('returns true when bearer token matches MAPPING_SYNC_TOKEN', async () => {
    process.env.MAPPING_SYNC_TOKEN = 'sync-secret'

    const unauthorized = {
      req: { header: (name: string) => (name === 'Authorization' ? undefined : undefined) },
    } as never

    const authorized = {
      req: { header: (name: string) => (name === 'Authorization' ? 'Bearer sync-secret' : undefined) },
    } as never

    expect(await hasVerifiedAdminAuth(unauthorized)).toBe(false)
    expect(await hasVerifiedAdminAuth(authorized)).toBe(true)
  })
})
