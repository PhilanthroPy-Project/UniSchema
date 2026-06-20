import { afterEach, describe, expect, it } from 'vitest'

import { isEgressEnabled, resolveEgressConfig } from '../src/egress/config.js'

describe('resolveEgressConfig', () => {
  const originalEnv = {
    EGRESS_TARGET: process.env.EGRESS_TARGET,
    EGRESS_S3_BATCH_MAX_BYTES: process.env.EGRESS_S3_BATCH_MAX_BYTES,
    EGRESS_S3_FLUSH_INTERVAL_MS: process.env.EGRESS_S3_FLUSH_INTERVAL_MS,
    AIRFLOW_WEBHOOK_URL: process.env.AIRFLOW_WEBHOOK_URL,
  }

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('disables S3 egress when the bucket is not configured', () => {
    const config = resolveEgressConfig()

    expect(
      isEgressEnabled({
        ...config,
        target: 's3',
        s3Bucket: undefined,
      }),
    ).toBe(false)
  })

  it('falls back to safe defaults for invalid numeric env vars', () => {
    process.env.EGRESS_S3_BATCH_MAX_BYTES = 'not-a-number'
    process.env.EGRESS_S3_FLUSH_INTERVAL_MS = '-1'

    const config = resolveEgressConfig()

    expect(config.s3BatchMaxBytes).toBe(5 * 1024 * 1024)
    expect(config.s3FlushIntervalMs).toBe(120_000)
  })

  it('enables local egress and disables explicit none targets', () => {
    expect(isEgressEnabled({ ...resolveEgressConfig(), target: 'local' })).toBe(true)
    expect(isEgressEnabled({ ...resolveEgressConfig(), target: 'none' })).toBe(false)
  })

  it('reads optional Airflow webhook settings from the environment', () => {
    process.env.AIRFLOW_WEBHOOK_URL = 'https://airflow.example.com/hook'

    const config = resolveEgressConfig()

    expect(config.airflowWebhookUrl).toBe('https://airflow.example.com/hook')
  })
})
