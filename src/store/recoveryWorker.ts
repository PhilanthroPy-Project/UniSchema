import { VENDOR_WEBHOOK_CONFIGS } from '../config/webhookRoutes.js'
import { publishEgressEvent } from '../egress/publisher.js'
import { isEgressEnabled } from '../egress/config.js'
import { processIngestion } from '../middleware/webhookHandler.js'
import { acknowledgeEgressEvents, listPendingEgressEvents } from './egressStore.js'
import { listStalePendingIngestions, releaseStaleProcessingIngestions } from './ingestionQueue.js'
import { logError, logInfo } from '../utils/logger.js'

const STALE_INGESTION_MS = 5 * 60 * 1000

export async function recoverPendingIngestions(
  olderThanMs = STALE_INGESTION_MS,
): Promise<number> {
  const released = await releaseStaleProcessingIngestions(olderThanMs)

  if (released > 0) {
    logInfo('[recovery] released stale processing ingestions', { count: released, olderThanMs })
  }

  const staleIngestions = await listStalePendingIngestions(olderThanMs)

  if (staleIngestions.length === 0) {
    return 0
  }

  logInfo('[recovery] re-processing stale pending ingestions', {
    count: staleIngestions.length,
    olderThanMs,
  })

  let recovered = 0

  for (const ingestion of staleIngestions) {
    const config = VENDOR_WEBHOOK_CONFIGS[ingestion.vendor]

    if (!config) {
      logError('[recovery] skipping ingestion with unknown vendor', {
        ingestionId: ingestion.id,
        vendor: ingestion.vendor,
      })
      continue
    }

    await processIngestion(ingestion.id, config)
    recovered += 1
  }

  return recovered
}

export async function recoverPendingEgress(limit = 500): Promise<number> {
  if (!isEgressEnabled()) {
    return 0
  }

  const pending = await listPendingEgressEvents(limit)

  if (pending.length === 0) {
    return 0
  }

  logInfo('[recovery] re-publishing pending egress events', { count: pending.length })

  let published = 0

  for (const record of pending) {
    try {
      const result = await publishEgressEvent(record)
      await acknowledgeEgressEvents([record.id])
      published += 1

      logInfo('[recovery] egress event published', {
        eventId: record.eventId,
        location: result.location,
      })
    } catch (error) {
      logError('[recovery] failed to publish egress event', {
        eventId: record.eventId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return published
}
