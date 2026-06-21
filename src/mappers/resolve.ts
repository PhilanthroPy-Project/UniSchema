import type { ConstituentEvent } from '../schema/master.js'
import { getMapping } from '../store/mappingRegistry.js'
import type { DriftVendor } from '../utils/driftCapture.js'
import { mapBlackbaudToMaster } from './blackbaud.js'
import { mapCventToMaster } from './cvent.js'
import { mapWithArtifact } from './dynamic.js'
import { mapEllucianToMaster } from './ellucian.js'
import { mapGiveCampusToMaster } from './givecampus.js'
import { mapImodulesToMaster } from './imodules.js'
import { mapNpspToMaster } from './npsp.js'
import { mapSlateToMaster } from './slate.js'

export async function resolveVendorMapper(
  vendor: DriftVendor,
): Promise<(rawPayload: unknown) => ConstituentEvent> {
  const stored = await getMapping(vendor)

  if (stored && stored.mappings.length > 0) {
    return (rawPayload) => mapWithArtifact(rawPayload, stored)
  }

  switch (vendor) {
    case 'cvent':
      return mapCventToMaster
    case 'givecampus':
      return mapGiveCampusToMaster
    case 'imodules':
      return mapImodulesToMaster
    case 'blackbaud':
      return mapBlackbaudToMaster
    case 'npsp':
      return mapNpspToMaster
    case 'slate':
      return mapSlateToMaster
    case 'ellucian':
      return mapEllucianToMaster
    default:
      throw new Error(`Unsupported vendor: ${vendor}`)
  }
}

export async function mapVendorPayload(
  vendor: DriftVendor,
  rawPayload: unknown,
): Promise<ConstituentEvent> {
  const mapper = await resolveVendorMapper(vendor)
  return mapper(rawPayload)
}
