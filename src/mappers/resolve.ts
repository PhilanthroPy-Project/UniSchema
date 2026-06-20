import type { ConstituentEvent } from '../schema/master.js'
import { getMapping } from '../store/mappingRegistry.js'
import type { DriftVendor } from '../utils/driftCapture.js'
import { mapCventToMaster } from './cvent.js'
import { mapWithArtifact } from './dynamic.js'
import { mapGiveCampusToMaster } from './givecampus.js'

/**
 * Resolves the mapper for a vendor: admin canvas config takes precedence,
 * otherwise falls back to the built-in TypeScript mapper.
 */
export function resolveVendorMapper(
  vendor: DriftVendor,
): (rawPayload: unknown) => ConstituentEvent {
  const stored = getMapping(vendor)

  if (stored && stored.mappings.length > 0) {
    return (rawPayload) => mapWithArtifact(rawPayload, stored)
  }

  switch (vendor) {
    case 'cvent':
      return mapCventToMaster
    case 'givecampus':
      return mapGiveCampusToMaster
    default:
      throw new Error(`Unsupported vendor: ${vendor}`)
  }
}

export function mapVendorPayload(vendor: DriftVendor, rawPayload: unknown): ConstituentEvent {
  return resolveVendorMapper(vendor)(rawPayload)
}
