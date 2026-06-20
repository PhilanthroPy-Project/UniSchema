import { describe, expect, it } from 'vitest'
import type { Connection, Edge, Node } from 'reactflow'

import {
  SOURCE_FIELD_NODE_TYPE,
  TARGET_FIELD_NODE_TYPE,
  dedupeTargetEdges,
  isSourceToTargetConnection,
} from '../src/utils/connectionValidation'

describe('isSourceToTargetConnection', () => {
  const nodes: Node[] = [
    {
      id: 'source-donor_email',
      type: SOURCE_FIELD_NODE_TYPE,
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: 'target-constituentEmail',
      type: TARGET_FIELD_NODE_TYPE,
      position: { x: 0, y: 0 },
      data: {},
    },
  ]

  it('allows source-to-target connections', () => {
    const connection: Connection = {
      source: 'source-donor_email',
      target: 'target-constituentEmail',
      sourceHandle: 'donor_email',
      targetHandle: 'constituentEmail',
    }

    expect(isSourceToTargetConnection(connection, nodes)).toBe(true)
  })

  it('rejects source-to-source connections', () => {
    const connection: Connection = {
      source: 'source-donor_email',
      target: 'source-donor_email',
      sourceHandle: 'donor_email',
      targetHandle: 'donor_email',
    }

    expect(isSourceToTargetConnection(connection, nodes)).toBe(false)
  })

  it('rejects target-to-target connections', () => {
    const connection: Connection = {
      source: 'target-constituentEmail',
      target: 'target-constituentEmail',
      sourceHandle: 'constituentEmail',
      targetHandle: 'amount',
    }

    expect(isSourceToTargetConnection(connection, nodes)).toBe(false)
  })
})

describe('dedupeTargetEdges', () => {
  it('removes an existing edge mapped to the same target handle', () => {
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'source-value',
        target: 'target-amount',
        sourceHandle: 'value',
        targetHandle: 'amount',
      },
    ]

    const connection: Connection = {
      source: 'source-currency',
      target: 'target-amount',
      sourceHandle: 'currency',
      targetHandle: 'amount',
    }

    expect(dedupeTargetEdges(edges, connection)).toEqual([])
  })
})
