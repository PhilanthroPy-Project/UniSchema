import { describe, expect, it } from 'vitest'

import { isEgressEnabled, resolveEgressConfig } from '../src/egress/config.js'

describe('resolveEgressConfig', () => {
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
})
