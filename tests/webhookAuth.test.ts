import { afterEach, describe, expect, it } from 'vitest'

import { VENDOR_WEBHOOK_CONFIGS } from '../src/config/webhookRoutes.js'
import { resolveSignatureVerification } from '../src/utils/webhookAuth.js'

describe('resolveSignatureVerification', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalRequired = process.env.WEBHOOK_SIGNATURE_REQUIRED
  const originalSecret = process.env.GIVECAMPUS_WEBHOOK_SECRET

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalRequired === undefined) {
      delete process.env.WEBHOOK_SIGNATURE_REQUIRED
    } else {
      process.env.WEBHOOK_SIGNATURE_REQUIRED = originalRequired
    }
    if (originalSecret === undefined) {
      delete process.env.GIVECAMPUS_WEBHOOK_SECRET
    } else {
      process.env.GIVECAMPUS_WEBHOOK_SECRET = originalSecret
    }
  })

  it('skips verification in development when the secret is not configured', () => {
    delete process.env.GIVECAMPUS_WEBHOOK_SECRET
    process.env.NODE_ENV = 'development'
    delete process.env.WEBHOOK_SIGNATURE_REQUIRED

    expect(resolveSignatureVerification(VENDOR_WEBHOOK_CONFIGS.givecampus)).toEqual({
      action: 'skip',
    })
  })

  it('requires verification when the secret is configured', () => {
    process.env.GIVECAMPUS_WEBHOOK_SECRET = 'abc'

    const result = resolveSignatureVerification(VENDOR_WEBHOOK_CONFIGS.givecampus)

    expect(result.action).toBe('verify')
    if (result.action === 'verify') {
      expect(result.secret).toBe('abc')
    }
  })

  it('fails closed when WEBHOOK_SIGNATURE_REQUIRED is true without a secret', () => {
    delete process.env.GIVECAMPUS_WEBHOOK_SECRET
    process.env.WEBHOOK_SIGNATURE_REQUIRED = 'true'
    process.env.NODE_ENV = 'development'

    expect(resolveSignatureVerification(VENDOR_WEBHOOK_CONFIGS.givecampus)).toEqual({
      action: 'misconfigured',
    })
  })

  it('fails closed in production when the secret is missing', () => {
    delete process.env.GIVECAMPUS_WEBHOOK_SECRET
    delete process.env.WEBHOOK_SIGNATURE_REQUIRED
    process.env.NODE_ENV = 'production'

    expect(resolveSignatureVerification(VENDOR_WEBHOOK_CONFIGS.givecampus)).toEqual({
      action: 'misconfigured',
    })
  })
})
