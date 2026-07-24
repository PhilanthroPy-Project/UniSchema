import { describe, expect, it } from 'vitest'

import { computeHumanAckRate } from '../../src/routes/health.js'

describe('computeHumanAckRate', () => {
  it('returns null when no drift events exist', () => {
    expect(computeHumanAckRate(0, 0)).toBeNull()
  })

  it('returns 0 when nothing has been acknowledged', () => {
    expect(computeHumanAckRate(0, 5)).toBe(0)
  })

  it('returns the acknowledged share', () => {
    expect(computeHumanAckRate(3, 4)).toBe(0.75)
  })

  it('rounds to four decimal places', () => {
    expect(computeHumanAckRate(1, 3)).toBe(0.3333)
  })
})
