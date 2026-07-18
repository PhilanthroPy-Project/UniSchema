import { describe, expect, it } from 'vitest'

import { VENDOR_REGISTRY, VENDOR_TIERS } from '../../src/config/webhookRoutes.js'

describe('vendor registry', () => {
  it('registers eight built-in vendors with tier metadata', () => {
    expect(VENDOR_REGISTRY).toHaveLength(8)

    for (const entry of VENDOR_REGISTRY) {
      expect(VENDOR_TIERS[entry.slug as keyof typeof VENDOR_TIERS]).toBe(entry.tier)
      expect(entry.webhookPath).toBe(`/webhooks/${entry.slug}`)
    }
  })

  it('marks GiveCampus and Cvent as tier 1', () => {
    const tier1 = VENDOR_REGISTRY.filter((entry) => entry.tier === 1).map((entry) => entry.slug)

    expect(tier1.sort()).toEqual(['cvent', 'givecampus'])
  })
})
