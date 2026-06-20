import { describe, expect, it } from 'vitest'

import {
  computeWebhookHmacSha256,
  readWebhookSignatureHeader,
  verifyWebhookSignature,
} from '../../src/utils/webhookSignature.js'

describe('webhookSignature', () => {
  const secret = 'signing-secret'
  const rawBody = JSON.stringify({ id: 'gc-1' })

  it('computes and verifies a hex digest', () => {
    const digest = computeWebhookHmacSha256(secret, rawBody)

    expect(verifyWebhookSignature(secret, rawBody, digest)).toBe(true)
  })

  it('rejects missing signature headers', () => {
    expect(verifyWebhookSignature(secret, rawBody, undefined)).toBe(false)
  })

  it('rejects malformed signature values', () => {
    expect(verifyWebhookSignature(secret, rawBody, 'not-valid-hex')).toBe(false)
  })

  it('reads the preferred header first and falls back to vendor defaults', () => {
    const signature = readWebhookSignatureHeader(
      (name) => {
        if (name === 'x-hub-signature-256') {
          return 'sha256=abc'
        }

        return undefined
      },
      'x-custom-signature',
    )

    expect(signature).toBe('sha256=abc')
  })

  it('returns undefined when no signature headers are present', () => {
    expect(readWebhookSignatureHeader(() => undefined)).toBeUndefined()
  })
})
