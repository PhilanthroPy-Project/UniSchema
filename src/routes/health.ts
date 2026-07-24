import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import type { Context } from 'hono'

import { VENDOR_REGISTRY } from '../config/webhookRoutes.js'
import { getEgressConfigSummary } from '../egress/config.js'
import { getDatabaseDialect } from '../db/dialect.js'
import { countPendingIngestions } from '../store/ingestQueue.js'
import { countDriftEvents } from '../store/driftQueue.js'
import { countPendingDriftEvents } from '../utils/driftCapture.js'
import { isOidcConfigured } from '../utils/oidcAuth.js'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Share of captured drift events a human has acknowledged (marked processed).
 * A human-intervention-frequency style signal for the human-in-the-loop drift
 * loop; the metric concept is discussed in the authors' related work (see
 * docs/ai-agent-loop.md and CITATION.cff). This is UniSchema's own telemetry,
 * not a paper benchmark. Returns null when no drift events exist yet.
 */
export function computeHumanAckRate(processed: number, total: number): number | null {
  if (total <= 0) {
    return null
  }

  return Math.round((processed / total) * 10000) / 10000
}

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
  const pendingIngestions = await countPendingIngestions()
  const driftProcessedCount = await countDriftEvents('processed')
  const driftTotalCount = await countDriftEvents()

  return c.json({
    status: 'ok',
    version: readPackageVersion(),
    egressTarget: egress.target,
    driftPendingCount: await countPendingDriftEvents(),
    driftProcessedCount,
    humanAckRate: computeHumanAckRate(driftProcessedCount, driftTotalCount),
    pendingIngestionCount: pendingIngestions,
    redisRateLimit: Boolean(process.env.REDIS_URL?.trim()),
    ingestQueue: getDatabaseDialect() === 'postgres' && process.env.INGEST_QUEUE_ENABLED !== 'false'
      ? 'pg-boss'
      : 'inline',
    timestamp: new Date().toISOString(),
  })
}

export function handleVendorsList(c: Context): Response {
  return c.json({
    success: true,
    vendors: VENDOR_REGISTRY,
  })
}

export function handlePublicConfig(c: Context): Response {
  return c.json({
    oidcEnabled: isOidcConfigured(),
    vendors: VENDOR_REGISTRY,
  })
}
