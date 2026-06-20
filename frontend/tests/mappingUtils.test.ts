import { describe, expect, it } from 'vitest'
import type { Edge } from 'reactflow'

import { toMappingConnections } from '../src/mappingUtils'

describe('toMappingConnections', () => {
  it('returns an empty array when no edges exist', () => {
    expect(toMappingConnections([])).toEqual([])
  })

  it('maps valid React Flow edges to source/target field pairs', () => {
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'source-givecampus',
        target: 'destination-master',
        sourceHandle: 'donor_email',
        targetHandle: 'constituentEmail',
      },
      {
        id: 'edge-2',
        source: 'source-givecampus',
        target: 'destination-master',
        sourceHandle: 'value',
        targetHandle: 'amount',
      },
    ]

    expect(toMappingConnections(edges)).toEqual([
      { source: 'donor_email', target: 'constituentEmail' },
      { source: 'value', target: 'amount' },
    ])
  })

  it('ignores edges missing source or target handles', () => {
    const edges: Edge[] = [
      {
        id: 'edge-invalid',
        source: 'source-givecampus',
        target: 'destination-master',
      },
      {
        id: 'edge-valid',
        source: 'source-givecampus',
        target: 'destination-master',
        sourceHandle: 'currency',
        targetHandle: 'currency',
      },
    ]

    expect(toMappingConnections(edges)).toEqual([
      { source: 'currency', target: 'currency' },
    ])
  })
})
