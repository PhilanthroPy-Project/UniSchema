import { describe, expect, it } from 'vitest'
import type { Edge } from 'reactflow'

import { getMappingsFingerprint, toMappingConnections } from '../src/mappingUtils'

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

describe('getMappingsFingerprint', () => {
  const sampleEdges: Edge[] = [
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

  it('returns the same fingerprint for identical edge sets', () => {
    const first = getMappingsFingerprint(sampleEdges)
    const second = getMappingsFingerprint([...sampleEdges])

    expect(first).toBe(second)
  })

  it('returns the same fingerprint regardless of edge order', () => {
    const reversed = [...sampleEdges].reverse()
    expect(getMappingsFingerprint(sampleEdges)).toBe(getMappingsFingerprint(reversed))
  })

  it('returns different fingerprints when mappings change', () => {
    const baseline = getMappingsFingerprint(sampleEdges)
    const modified = getMappingsFingerprint(sampleEdges.slice(0, 1))

    expect(baseline).not.toBe(modified)
  })

  it('includes metadata mappings in the fingerprint', () => {
    const withoutMeta = getMappingsFingerprint(sampleEdges, [])
    const withMeta = getMappingsFingerprint(sampleEdges, [
      { source: 'donation_type', key: 'donation_type' },
    ])

    expect(withoutMeta).not.toBe(withMeta)
  })
})
