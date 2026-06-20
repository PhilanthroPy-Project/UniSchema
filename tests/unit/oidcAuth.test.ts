import { describe, expect, it } from 'vitest'

import { mappingDiffHash } from '../../src/utils/oidcAuth.js'

describe('mappingDiffHash', () => {
  it('returns a stable 16-character hex prefix for the same artifact JSON', () => {
    const json = '{"vendor":"GiveCampus","mappings":[]}'

    expect(mappingDiffHash(json)).toBe(mappingDiffHash(json))
    expect(mappingDiffHash(json)).toMatch(/^[a-f0-9]{16}$/)
  })

  it('changes when artifact content changes', () => {
    const first = mappingDiffHash('{"vendor":"GiveCampus"}')
    const second = mappingDiffHash('{"vendor":"Cvent"}')

    expect(first).not.toBe(second)
  })
})
