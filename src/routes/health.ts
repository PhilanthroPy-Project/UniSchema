import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import type { Context } from 'hono'

import { VENDOR_REGISTRY } from '../config/webhookRoutes.js'
import { getEgressConfigSummary } from '../egress/config.js'
import { getDatabaseDialect } from '../db/dialect.js'
import {
  countAllIngestionRows,
  countDistinctPendingDriftSignatures,
  countDriftEventsByResolution,
  listProcessedDriftTimestamps,
} from '../db/unified.js'
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

/** Ratio rounded to 4 dp, or null when the denominator is empty. */
export function computeRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null
  }

  return Math.round((numerator / denominator) * 10000) / 10000
}

/**
 * Median seconds from drift capture to human ack — the drift loop's MTTR.
 * "Incident" = a schema-drift event; "resolve" = a human acknowledgement.
 * Framing follows the authors' AIOps observability work (see docs/ai-agent-loop.md).
 */
export function computeMttrSeconds(
  pairs: Array<{ capturedAt: string; processedAt: string | null }>,
): number | null {
  const durations = pairs
    .map((pair) =>
      pair.processedAt ? (Date.parse(pair.processedAt) - Date.parse(pair.capturedAt)) / 1000 : null,
    )
    .filter((seconds): seconds is number => seconds !== null && Number.isFinite(seconds) && seconds >= 0)
    .sort((a, b) => a - b)

  if (durations.length === 0) {
    return null
  }

  const mid = Math.floor(durations.length / 2)
  const median =
    durations.length % 2 === 0 ? (durations[mid - 1]! + durations[mid]!) / 2 : durations[mid]!

  return Math.round(median * 1000) / 1000
}

export type DriftMetrics = {
  driftPendingCount: number
  driftProcessedCount: number
  driftTotalCount: number
  driftDistinctPendingSignatures: number
  humanAckRate: number | null
  driftMttrSeconds: number | null
  driftDetectionRate: number | null
  driftFalsePositiveRate: number | null
  pendingIngestionCount: number
  ingestionTotalCount: number
}

/** Single source of truth for the operational numbers shared by /health and /metrics. */
export async function collectDriftMetrics(): Promise<DriftMetrics> {
  const [
    driftPendingCount,
    driftProcessedCount,
    driftTotalCount,
    driftDistinctPendingSignatures,
    driftFalsePositiveCount,
    pendingIngestionCount,
    ingestionTotalCount,
    processedTimestamps,
  ] = await Promise.all([
    countPendingDriftEvents(),
    countDriftEvents('processed'),
    countDriftEvents(),
    countDistinctPendingDriftSignatures(),
    countDriftEventsByResolution('false_positive'),
    countPendingIngestions(),
    countAllIngestionRows(),
    listProcessedDriftTimestamps(),
  ])

  return {
    driftPendingCount,
    driftProcessedCount,
    driftTotalCount,
    driftDistinctPendingSignatures,
    humanAckRate: computeHumanAckRate(driftProcessedCount, driftTotalCount),
    driftMttrSeconds: computeMttrSeconds(processedTimestamps),
    driftDetectionRate: computeRate(driftTotalCount, ingestionTotalCount),
    driftFalsePositiveRate: computeRate(driftFalsePositiveCount, driftProcessedCount),
    pendingIngestionCount,
    ingestionTotalCount,
  }
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
  const metrics = await collectDriftMetrics()

  return c.json({
    status: 'ok',
    version: readPackageVersion(),
    egressTarget: egress.target,
    driftPendingCount: metrics.driftPendingCount,
    driftProcessedCount: metrics.driftProcessedCount,
    driftDistinctPendingSignatures: metrics.driftDistinctPendingSignatures,
    humanAckRate: metrics.humanAckRate,
    driftMttrSeconds: metrics.driftMttrSeconds,
    driftDetectionRate: metrics.driftDetectionRate,
    driftFalsePositiveRate: metrics.driftFalsePositiveRate,
    pendingIngestionCount: metrics.pendingIngestionCount,
    redisRateLimit: Boolean(process.env.REDIS_URL?.trim()),
    ingestQueue: getDatabaseDialect() === 'postgres' && process.env.INGEST_QUEUE_ENABLED !== 'false'
      ? 'pg-boss'
      : 'inline',
    timestamp: new Date().toISOString(),
  })
}

const METRIC_HELP: Record<string, string> = {
  unischema_drift_pending: 'Pending (unacknowledged) schema-drift events',
  unischema_drift_processed: 'Acknowledged schema-drift events',
  unischema_drift_total: 'Total schema-drift events captured',
  unischema_drift_distinct_pending_signatures: 'Distinct drift signatures among pending events',
  unischema_human_ack_rate: 'Share of drift events acknowledged by a human',
  unischema_drift_mttr_seconds: 'Median seconds from drift capture to human ack',
  unischema_drift_detection_rate: 'Drift events divided by total ingestion attempts',
  unischema_drift_false_positive_rate: 'Share of acked drift events labelled false_positive',
  unischema_pending_ingestions: 'Ingestions not yet claimed',
  unischema_ingestions_total: 'Total ingestion attempts',
}

/**
 * Prometheus text-exposition of the same numbers /health computes, so operators
 * can scrape drift-loop health into Grafana. Null-valued gauges are omitted
 * (Prometheus has no null). Mirrors the monitoring surface in the authors'
 * observability and enterprise-agents papers (see docs/ai-agent-loop.md).
 */
export async function handleMetrics(c: Context): Promise<Response> {
  const m = await collectDriftMetrics()
  const gauges: Array<[string, number | null]> = [
    ['unischema_drift_pending', m.driftPendingCount],
    ['unischema_drift_processed', m.driftProcessedCount],
    ['unischema_drift_total', m.driftTotalCount],
    ['unischema_drift_distinct_pending_signatures', m.driftDistinctPendingSignatures],
    ['unischema_human_ack_rate', m.humanAckRate],
    ['unischema_drift_mttr_seconds', m.driftMttrSeconds],
    ['unischema_drift_detection_rate', m.driftDetectionRate],
    ['unischema_drift_false_positive_rate', m.driftFalsePositiveRate],
    ['unischema_pending_ingestions', m.pendingIngestionCount],
    ['unischema_ingestions_total', m.ingestionTotalCount],
  ]

  const lines: string[] = []
  for (const [name, value] of gauges) {
    if (value === null) {
      continue
    }
    lines.push(`# HELP ${name} ${METRIC_HELP[name]}`)
    lines.push(`# TYPE ${name} gauge`)
    lines.push(`${name} ${value}`)
  }

  return c.text(`${lines.join('\n')}\n`, 200, {
    'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
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
