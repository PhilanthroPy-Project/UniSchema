import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  formatConfigValidationError,
  validateProductionConfig,
} from '../../src/utils/configValidation.js'

describe('validateProductionConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns no issues outside production', () => {
    process.env.NODE_ENV = 'development'
    expect(validateProductionConfig()).toEqual([])
  })

  it('flags missing webhook secrets in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.GIVECAMPUS_WEBHOOK_SECRET

    const issues = validateProductionConfig()
    expect(issues.some((issue) => issue.code === 'WEBHOOK_SECRET_MISSING')).toBe(true)
    expect(formatConfigValidationError(issues)).toContain('GIVECAMPUS_WEBHOOK_SECRET')
  })

  it('flags missing S3 and mapping sync configuration in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.GIVECAMPUS_WEBHOOK_SECRET = 'secret'
    process.env.CVENT_WEBHOOK_SECRET = 'secret'
    process.env.IMODULES_WEBHOOK_SECRET = 'secret'
    process.env.BLACKBAUD_WEBHOOK_SECRET = 'secret'
    process.env.NPSP_WEBHOOK_SECRET = 'secret'
    process.env.SLATE_WEBHOOK_SECRET = 'secret'
    process.env.EGRESS_TARGET = 's3'
    delete process.env.EGRESS_S3_BUCKET
    delete process.env.AWS_REGION
    process.env.MAPPING_SYNC_REQUIRED = 'true'
    delete process.env.MAPPING_SYNC_TOKEN
    process.env.REQUIRE_TRUST_PROXY = 'true'
    delete process.env.TRUST_PROXY

    const issues = validateProductionConfig()
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'EGRESS_S3_BUCKET_MISSING',
        'AWS_REGION_MISSING',
        'MAPPING_SYNC_TOKEN_MISSING',
        'TRUST_PROXY_REQUIRED',
      ]),
    )
  })

  it('skips webhook secret checks when signature verification is disabled', () => {
    process.env.NODE_ENV = 'production'
    process.env.WEBHOOK_SIGNATURE_REQUIRED = 'false'
    delete process.env.GIVECAMPUS_WEBHOOK_SECRET

    expect(validateProductionConfig().some((issue) => issue.code === 'WEBHOOK_SECRET_MISSING')).toBe(
      false,
    )
  })
})
