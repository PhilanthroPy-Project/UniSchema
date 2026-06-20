import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import type { Context } from 'hono'

import { VENDOR_REGISTRY } from '../config/webhookRoutes.js'
import { getEgressConfigSummary } from '../egress/config.js'
import { countPendingDriftEvents } from '../utils/driftCapture.js'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(packageRoot, 'package.json'), 'utf8')
    const parsed = JSON.parse(raw) as { version?: string }
    return parsed.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function handleHealth(c: Context): Promise<Response> {
  const egress = getEgressConfigSummary()

  return c.json({
    status: 'ok',
    version: readPackageVersion(),
    egressTarget: egress.target,
    driftPendingCount: await countPendingDriftEvents(),
    timestamp: new Date().toISOString(),
  })
}

export function handleVendorsList(c: Context): Response {
  const labels: Record<string, string> = {
    givecampus: 'GiveCampus',
    cvent: 'Cvent',
    imodules: 'iModules',
    blackbaud: 'Blackbaud',
    npsp: 'NPSP',
  }

  return c.json({
    success: true,
    vendors: VENDOR_REGISTRY.map((entry) => ({
      ...entry,
      label: labels[entry.slug] ?? entry.label,
    })),
  })
}
