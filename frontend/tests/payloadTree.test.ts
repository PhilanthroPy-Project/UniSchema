import { describe, expect, it } from 'vitest'

import {
  buildPayloadTree,
  flattenLeafPaths,
  formatPayloadValue,
  getValueAtPath,
} from '../src/utils/payloadTree'

describe('payloadTree utilities', () => {
  const payload = {
    id: 'gc-1',
    donor_email: 'patron@university.edu',
    nested: {
      currency: 'USD',
    },
  }

  it('builds a nested payload tree', () => {
    const tree = buildPayloadTree(payload)

    expect(tree).toHaveLength(3)
    expect(tree[2]?.children[0]?.path).toBe('nested.currency')
  })

  it('flattens leaf paths for mappable source fields', () => {
    expect(flattenLeafPaths(buildPayloadTree(payload))).toEqual([
      'id',
      'donor_email',
      'nested.currency',
    ])
  })

  it('reads values by dot path', () => {
    expect(getValueAtPath(payload, 'nested.currency')).toBe('USD')
  })

  it('formats primitive values for display', () => {
    expect(formatPayloadValue('USD')).toBe('"USD"')
    expect(formatPayloadValue(42)).toBe('42')
  })
})
