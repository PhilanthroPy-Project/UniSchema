import { describe, expect, it } from 'vitest'

import app from '../helpers/app.js'
import { upsertMapping } from '../../src/store/mappingRegistry.js'

const sampleArtifact = {
  vendor: 'givecampus',
  exportedAt: '2026-06-01T00:00:00.000Z',
  mappings: [{ source: 'donor_email', target: 'constituentEmail' as const }],
  metadataMappings: [],
}

describe('GET /api/mappings/:vendor/audit', () => {
  it('returns mapping audit entries after sync', async () => {
    await upsertMapping(sampleArtifact, '2026-06-01T00:00:00.000Z')

    const response = await app.request('/api/mappings/givecampus/audit')
    const body = (await response.json()) as {
      success: boolean
      count: number
      entries: Array<{ actor: string; diffHash: string }>
    }

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.count).toBeGreaterThan(0)
    expect(body.entries[0]?.actor).toBeTruthy()
  })
})
