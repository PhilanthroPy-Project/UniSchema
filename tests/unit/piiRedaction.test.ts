import { describe, expect, it } from 'vitest'

import { redactPayload } from '../../src/utils/piiRedaction.js'

describe('redactPayload', () => {
  it('redacts email fields and names', () => {
    const redacted = redactPayload({
      donor_email: 'patron@university.edu',
      first: 'Jane',
      last: 'Doe',
      value: 100,
    }) as Record<string, unknown>

    expect(String(redacted.donor_email)).toContain('@example.com')
    expect(redacted.first).toBe('[REDACTED]')
    expect(redacted.last).toBe('[REDACTED]')
    expect(redacted.value).toBe(100)
  })

  it('passes through null and nested arrays', () => {
    expect(redactPayload(null)).toBeNull()
    expect(redactPayload([{ email: 'a@b.com' }])).toEqual([
      { email: expect.stringContaining('@example.com') },
    ])
  })
})
