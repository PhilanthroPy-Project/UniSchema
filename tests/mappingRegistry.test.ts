import { describe, expect, it } from 'vitest'

import type { MappingArtifact } from '../src/schema/mapping.js'
import {
  clearMappingRegistry,
  getMapping,
  upsertMapping,
} from '../src/store/mappingRegistry.js'

const sampleArtifact: MappingArtifact = {
  vendor: 'givecampus',
  exportedAt: '2026-06-01T00:00:00.000Z',
  mappings: [{ source: 'donor_email', target: 'constituentEmail' }],
  metadataMappings: [],
}

describe('mappingRegistry', () => {
  it('stores and retrieves vendor mappings', async () => {
    await upsertMapping(sampleArtifact, '2026-06-01T00:00:00.000Z')

    const stored = await getMapping('GiveCampus')

    expect(stored?.vendor).toBe('givecampus')
    expect(stored?.mappings).toEqual(sampleArtifact.mappings)
  })

  it('clears all stored mappings', async () => {
    await upsertMapping(sampleArtifact, '2026-06-01T00:00:00.000Z')
    await clearMappingRegistry()

    expect(await getMapping('givecampus')).toBeUndefined()
  })
})
