import { describe, expect, it } from 'vitest'

import { resolveSourceSystem } from '../src/utils/sourceSystem.js'
import { isDriftVendor } from '../src/utils/driftCapture.js'

describe('sourceSystem registry', () => {
  it('resolves all built-in vendor slugs', () => {
    expect(resolveSourceSystem('givecampus')).toBe('GIVECAMPUS')
    expect(resolveSourceSystem('cvent')).toBe('CVENT')
    expect(resolveSourceSystem('imodules')).toBe('IMODULES')
    expect(resolveSourceSystem('blackbaud')).toBe('BLACKBAUD')
    expect(resolveSourceSystem('npsp')).toBe('NPSP')
  })

  it('rejects unknown vendors', () => {
    expect(() => resolveSourceSystem('unknown')).toThrow()
  })
})

describe('drift vendor registry', () => {
  it('includes community vendor slugs', () => {
    expect(isDriftVendor('imodules')).toBe(true)
    expect(isDriftVendor('blackbaud')).toBe(true)
    expect(isDriftVendor('npsp')).toBe(true)
    expect(isDriftVendor('slate')).toBe(false)
  })
})
