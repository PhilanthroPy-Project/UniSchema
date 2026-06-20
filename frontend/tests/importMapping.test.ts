import { describe, expect, it } from 'vitest'

import { parseMappingArtifactJson, parsePayloadJson } from '../src/utils/importMapping'

describe('parseMappingArtifactJson', () => {
  it('parses a valid mapping artifact', () => {
    const raw = JSON.stringify({
      vendor: 'GiveCampus',
      exportedAt: '2026-06-20T12:00:00.000Z',
      mappings: [{ source: 'donor_email', target: 'constituentEmail' }],
      metadataMappings: [{ source: 'donation_type', key: 'donation_type' }],
    })

    const result = parseMappingArtifactJson(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.artifact.metadataMappings).toHaveLength(1)
    }
  })

  it('rejects invalid JSON', () => {
    expect(parseMappingArtifactJson('{').success).toBe(false)
  })
})

describe('parsePayloadJson', () => {
  it('requires an object payload', () => {
    expect(parsePayloadJson('[]').success).toBe(false)
  })
})
