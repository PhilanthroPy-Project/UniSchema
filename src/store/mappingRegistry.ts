import type { MappingArtifact } from '../schema/mapping.js'

export type StoredMapping = MappingArtifact & {
  syncedAt: string
}

const registry = new Map<string, StoredMapping>()

function normalizeVendorKey(vendor: string): string {
  return vendor.trim().toLowerCase()
}

export function upsertMapping(artifact: MappingArtifact, syncedAt: string): StoredMapping {
  const stored: StoredMapping = { ...artifact, syncedAt }
  registry.set(normalizeVendorKey(artifact.vendor), stored)
  return stored
}

export function getMapping(vendor: string): StoredMapping | undefined {
  return registry.get(normalizeVendorKey(vendor))
}

/** Test-only helper — resets the in-memory registry between test cases. */
export function clearMappingRegistry(): void {
  registry.clear()
}
