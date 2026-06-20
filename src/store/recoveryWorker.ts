import { VENDOR_WEBHOOK_CONFIGS } from '../config/webhookRoutes.js'
import { publishEgressEvent } from '../egress/publisher.js'
import { isEgressEnabled } from '../egress/config.js'
import {
  processIngestion,
} from '../middleware/webhookHandler.js'
import {
  acknowledgeEgressEvents,
  listPendingEgressEvents,
} from './egressStore.js'
import { listStalePendingIngestions } from './ingestionQueue.js'

const STALE_INGESTION_MS = 5 * 60 * 1000

/**
 * Re-processes webhook ingestions stuck in `pending` after a server crash or
 * dropped microtask — typically older than five minutes.
 */
export async function recoverPendingIngestions(
  olderThanMs = STALE_INGESTION_MS,
): Promise<number> {
  const staleIngestions = listStalePendingIngestions(olderThanMs)

  if (staleIngestions.length === 0) {
    return 0
  }

  console.info('[recovery] re-processing stale pending ingestions', {
    count: staleIngestions.length,
    olderThanMs,
  })

  let recovered = 0

  for (const ingestion of staleIngestions) {
    const config = VENDOR_WEBHOOK_CONFIGS[ingestion.vendor]

    if (!config) {
      console.warn('[recovery] skipping ingestion with unknown vendor', {
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

/** Re-publishes staged constituent events that never reached object storage. */
export async function recoverPendingEgress(limit = 500): Promise<number> {
  if (!isEgressEnabled()) {
    return 0
  }

  const pending = listPendingEgressEvents(limit)

  if (pending.length === 0) {
    return 0
  }

  console.info('[recovery] re-publishing pending egress events', {
    count: pending.length,
  })

  let published = 0

  for (const record of pending) {
    try {
      const result = await publishEgressEvent(record)
      acknowledgeEgressEvents([record.id])
      published += 1

      console.info('[recovery] egress event published', {
        eventId: record.eventId,
        location: result.location,
      })
    } catch (error) {
      console.error('[recovery] failed to publish egress event', {
        eventId: record.eventId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return published
}
