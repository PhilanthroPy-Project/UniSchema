import { describe, expect, it } from 'vitest'
import type { Edge } from 'reactflow'

import {
  buildMappingArtifact,
  serializeMappingArtifact,
  toMappingConnections,
} from '../src/mappingUtils'

describe('buildMappingArtifact', () => {
  it('builds a structured mapping artifact from React Flow edges', () => {
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'source-donor_email',
        target: 'target-constituentEmail',
        sourceHandle: 'donor_email',
        targetHandle: 'constituentEmail',
      },
      {
        id: 'edge-2',
        source: 'source-value',
        target: 'target-amount',
        sourceHandle: 'value',
        targetHandle: 'amount',
      },
    ]

    const artifact = buildMappingArtifact('GiveCampus', edges)

    expect(artifact.vendor).toBe('GiveCampus')
    expect(artifact.mappings).toEqual(toMappingConnections(edges))
    expect(artifact.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('serializes mapping artifacts as formatted JSON', () => {
    const artifact = {
      vendor: 'GiveCampus',
      exportedAt: '2026-06-20T12:00:00.000Z',
      mappings: [{ source: 'donor_email', target: 'constituentEmail' as const }],
    }

    expect(serializeMappingArtifact(artifact)).toContain('"constituentEmail"')
  })
})
