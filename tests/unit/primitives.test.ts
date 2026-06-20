import { describe, expect, it } from 'vitest'

import {
  coerceToPrimitive,
  PrimitiveRecordSchema,
  toPrimitiveRecord,
} from '../../src/schema/primitives.js'

describe('coerceToPrimitive', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['text', 'text'],
    [42, 42],
    [true, true],
    [{ nested: 1 }, '{"nested":1}'],
    [[1, 2], '[1,2]'],
  ] as const)('coerces %j to a flat primitive', (input, expected) => {
    expect(coerceToPrimitive(input)).toBe(expected)
  })
})

describe('toPrimitiveRecord', () => {
  it('flattens top-level vendor payload keys', () => {
    expect(toPrimitiveRecord({ id: 'gc-1', active: true, amount: 10 })).toEqual({
      id: 'gc-1',
      active: true,
      amount: 10,
    })
  })

  it('rejects non-object payloads', () => {
    expect(() => toPrimitiveRecord('invalid')).toThrow('Payload must be a JSON object')
    expect(() => toPrimitiveRecord(null)).toThrow('Payload must be a JSON object')
    expect(() => toPrimitiveRecord([])).toThrow('Payload must be a JSON object')
  })
})

describe('PrimitiveRecordSchema', () => {
  it('accepts flat primitive records', () => {
    expect(PrimitiveRecordSchema.parse({ campaign: 'spring', count: 3 })).toEqual({
      campaign: 'spring',
      count: 3,
    })
  })
})
