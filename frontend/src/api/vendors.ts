import { getVendorOption, type VendorOption } from '../data/samplePayloads'

export type VendorRegistryEntry = {
  slug: string
  label: string
  tier: 1 | 2 | 3
  webhookPath: string
  hasSample: boolean
}

export type PublicConfig = {
  oidcEnabled: boolean
  vendors: VendorRegistryEntry[]
}

export async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await fetch('/api/config/public')

  if (!response.ok) {
    throw new Error(`Failed to load public config (${response.status})`)
  }

  return response.json() as Promise<PublicConfig>
}

export async function fetchVendors(): Promise<VendorRegistryEntry[]> {
  const response = await fetch('/api/vendors')

  if (!response.ok) {
    throw new Error(`Failed to load vendors (${response.status})`)
  }

  const body = (await response.json()) as { success: boolean; vendors: VendorRegistryEntry[] }
  return body.vendors
}

export function mergeVendorOptions(
  registry: VendorRegistryEntry[],
): Array<VendorOption & { tier: 1 | 2 | 3 }> {
  return registry
    .map((entry) => {
      const sample = getVendorOption(entry.slug)
      if (!sample) {
        return null
      }

      return {
        ...sample,
        tier: entry.tier,
      }
    })
    .filter((entry): entry is VendorOption & { tier: 1 | 2 | 3 } => entry !== null)
}

export function tierLabel(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1:
      return 'Tier 1'
    case 2:
      return 'Tier 2'
    case 3:
      return 'Tier 3'
  }
}
