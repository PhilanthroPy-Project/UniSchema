import { eq } from 'drizzle-orm'

import { getDb } from '../db/client.js'
import { vendorMappings } from '../db/schema.js'
import type { MappingArtifact } from '../schema/mapping.js'

export type StoredMapping = MappingArtifact & {
  syncedAt: string
}

function normalizeVendorKey(vendor: string): string {
  return vendor.trim().toLowerCase()
}

export function upsertMapping(artifact: MappingArtifact, syncedAt: string): StoredMapping {
  const stored: StoredMapping = { ...artifact, syncedAt }
  const vendor = normalizeVendorKey(artifact.vendor)

  getDb()
    .insert(vendorMappings)
    .values({
      vendor,
      mappingsJson: JSON.stringify(artifact.mappings),
      metadataMappingsJson: JSON.stringify(artifact.metadataMappings ?? []),
      exportedAt: artifact.exportedAt,
      syncedAt,
    })
    .onConflictDoUpdate({
      target: vendorMappings.vendor,
      set: {
        mappingsJson: JSON.stringify(artifact.mappings),
        metadataMappingsJson: JSON.stringify(artifact.metadataMappings ?? []),
        exportedAt: artifact.exportedAt,
        syncedAt,
      },
    })
    .run()

  return stored
}

export function getMapping(vendor: string): StoredMapping | undefined {
  const row = getDb()
    .select()
    .from(vendorMappings)
    .where(eq(vendorMappings.vendor, normalizeVendorKey(vendor)))
    .get()

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

/** Test-only helper — resets persisted mappings between test cases. */
export function clearMappingRegistry(): void {
  getDb().delete(vendorMappings).run()
}
