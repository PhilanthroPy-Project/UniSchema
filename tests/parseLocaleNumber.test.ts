import { describe, expect, it } from 'vitest'

import { parseLocaleNumber } from '../src/utils/parseLocaleNumber.js'

describe('parseLocaleNumber', () => {
  it.each([
    ['1000.50', 1000.5],
    ['1,000.50', 1000.5],
    ['1.000,50', 1000.5],
    ['1000,50', 1000.5],
    ['1.000', 1000],
    ['1,000', 1000],
    ['500', 500],
    ['0', 0],
  ] as const)('parses %s as %s', (input, expected) => {
    expect(parseLocaleNumber(input)).toBe(expected)
  })

  it('strips currency symbols from numeric strings', () => {
    expect(parseLocaleNumber('$1,000.50')).toBe(1000.5)
    expect(parseLocaleNumber('€1.000,50')).toBe(1000.5)
    expect(parseLocaleNumber('£500.00')).toBe(500)
  })

  it('returns null for non-numeric strings', () => {
    expect(parseLocaleNumber('Five Hundred')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})
