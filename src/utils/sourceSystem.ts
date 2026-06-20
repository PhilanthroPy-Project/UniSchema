import { z } from 'zod'

import { SourceSystemSchema, type SourceSystem } from '../schema/master.js'

const VENDOR_TO_SOURCE_SYSTEM: Record<string, SourceSystem> = {
  cvent: 'CVENT',
  givecampus: 'GIVECAMPUS',
  imodules: 'IMODULES',
  blackbaud: 'BLACKBAUD',
  npsp: 'NPSP',
}

/** Maps a vendor slug to a strict `SourceSystem` enum value. */
export function resolveSourceSystem(vendor: string): SourceSystem {
  const normalized = vendor.trim().toLowerCase()
  const sourceSystem = VENDOR_TO_SOURCE_SYSTEM[normalized]

  if (!sourceSystem) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['sourceSystem'],
        message: `Unsupported vendor "${vendor}" — sourceSystem must be one of: ${SourceSystemSchema.options.join(', ')}`,
      },
    ])
  }

  return sourceSystem
}
