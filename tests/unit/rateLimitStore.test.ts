import { beforeEach, describe, expect, it } from 'vitest'

import { checkRateLimitDistributed, resetRateLimitStoreForTests } from '../../src/store/rateLimitStore.js'

describe('checkRateLimitDistributed', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests()
  })

  it('allows requests under the in-memory limit', async () => {
    const config = { maxRequests: 2, windowMs: 60_000 }

    expect(await checkRateLimitDistributed('127.0.0.1', config)).toBe(true)
    expect(await checkRateLimitDistributed('127.0.0.1', config)).toBe(true)
  })

  it('blocks requests over the in-memory limit', async () => {
    const config = { maxRequests: 1, windowMs: 60_000 }

    expect(await checkRateLimitDistributed('10.0.0.1', config)).toBe(true)
    expect(await checkRateLimitDistributed('10.0.0.1', config)).toBe(false)
  })
})
