import {
  deleteAllVendorMappings,
  selectVendorMappingByVendor,
  upsertVendorMappingRow,
} from '../db/unified.js'
import type { MappingArtifact } from '../schema/mapping.js'

export type StoredMapping = MappingArtifact & {
  syncedAt: string
}

function normalizeVendorKey(vendor: string): string {
  return vendor.trim().toLowerCase()
}

export async function upsertMapping(
  artifact: MappingArtifact,
  syncedAt: string,
): Promise<StoredMapping> {
  const stored: StoredMapping = { ...artifact, syncedAt }
  const vendor = normalizeVendorKey(artifact.vendor)

  await upsertVendorMappingRow({
    vendor,
    mappingsJson: JSON.stringify(artifact.mappings),
    metadataMappingsJson: JSON.stringify(artifact.metadataMappings ?? []),
    exportedAt: artifact.exportedAt,
    syncedAt,
  })

  return stored
}

export async function getMapping(vendor: string): Promise<StoredMapping | undefined> {
  const row = await selectVendorMappingByVendor(normalizeVendorKey(vendor))

  if (!row) {
    return undefined
  }

  return {
    vendor: row.vendor,
    exportedAt: row.exportedAt,
    mappings: JSON.parse(row.mappingsJson) as MappingArtifact['mappings'],
    metadataMappings: JSON.parse(row.metadataMappingsJson) as MappingArtifact['metadataMappings'],
    syncedAt: row.syncedAt,
  }
}

export async function clearMappingRegistry(): Promise<void> {
  await deleteAllVendorMappings()
}
