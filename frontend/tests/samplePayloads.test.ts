import { describe, expect, it } from 'vitest'

import {
  VENDOR_OPTIONS,
  getVendorLabel,
  getVendorOption,
} from '../src/data/samplePayloads'

describe('samplePayloads vendor catalog', () => {
  it('includes all eight built-in vendors', () => {
    expect(VENDOR_OPTIONS.map((option) => option.slug)).toEqual([
      'givecampus',
      'cvent',
      'imodules',
      'blackbaud',
      'npsp',
      'slate',
      'ellucian',
      'civicrm',
    ])
  })

  it('provides non-empty sample payloads for each vendor', () => {
    for (const option of VENDOR_OPTIONS) {
      expect(Object.keys(option.samplePayload).length).toBeGreaterThan(0)
      expect(option.label.length).toBeGreaterThan(0)
    }
  })

  it('resolves vendor metadata by slug', () => {
    expect(getVendorOption('CVENT')?.label).toBe('Cvent')
    expect(getVendorLabel('imodules')).toBe('iModules')
    expect(getVendorOption('unknown')).toBeUndefined()
    expect(getVendorLabel('unknown')).toBe('unknown')
  })
})
