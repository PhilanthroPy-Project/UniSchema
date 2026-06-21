import { describe, expect, it } from 'vitest'
import type { Edge } from 'reactflow'

import { getMissingRequiredMappings, validateRequiredMappings } from '../src/utils/requiredMappings'

describe('validateRequiredMappings', () => {
  it('passes when constituentEmail and eventType are mapped', () => {
    const edges: Edge[] = [
      { id: '1', source: 's1', target: 't1', targetHandle: 'constituentEmail' },
      { id: '2', source: 's2', target: 't2', targetHandle: 'eventType' },
    ]

    expect(validateRequiredMappings(edges)).toEqual({ ok: true })
  })

  it('reports missing required fields', () => {
    const edges: Edge[] = [
      { id: '1', source: 's1', target: 't1', targetHandle: 'constituentEmail' },
    ]

    const result = validateRequiredMappings(edges)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toContain('eventType')
    }
  })

  it('lists all missing required mappings', () => {
    expect(getMissingRequiredMappings([])).toEqual(['constituentEmail', 'eventType'])
  })
})
