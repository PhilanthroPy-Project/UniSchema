import { describe, expect, it } from 'vitest'

import { deterministicEventId } from '../../src/utils/deterministicEventId.js'

describe('deterministicEventId', () => {
  it('returns a stable UUID for the same vendor identifier', () => {
    const first = deterministicEventId('GIVECAMPUS', 'gc-999')
    const second = deterministicEventId('GIVECAMPUS', 'gc-999')

    expect(first).toBe(second)
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('returns different UUIDs for different vendor identifiers', () => {
    const first = deterministicEventId('GIVECAMPUS', 'gc-999')
    const second = deterministicEventId('GIVECAMPUS', 'gc-1000')

    expect(first).not.toBe(second)
  })

  it('scopes IDs by source system', () => {
    const giveCampus = deterministicEventId('GIVECAMPUS', 'shared-id')
    const cvent = deterministicEventId('CVENT', 'shared-id')

    expect(giveCampus).not.toBe(cvent)
  })
})
