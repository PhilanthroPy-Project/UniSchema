import type { WebhookRouteConfig } from '../middleware/webhookHandler.js'
import { processIngestion } from '../middleware/webhookHandler.js'
import { logError } from '../utils/logger.js'

/**
 * Schedules background ingestion on the next event-loop turn.
 * Durability comes from the SQLite `pending` → `processing` claim inside
 * `processIngestion`, not from an in-memory job queue.
 */
export function scheduleIngestion(ingestionId: string, config: WebhookRouteConfig): void {
  setImmediate(() => {
    void processIngestion(ingestionId, config).catch((error) => {
      logError('[ingestion] background processing failed', {
        ingestionId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  })
}
