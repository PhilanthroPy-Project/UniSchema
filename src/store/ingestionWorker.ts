import type { WebhookRouteConfig } from '../middleware/webhookHandler.js'
import { processIngestion } from '../middleware/webhookHandler.js'

/**
 * Schedules background ingestion on the next event-loop turn.
 * Durability comes from the SQLite `pending` → `processing` claim inside
 * `processIngestion`, not from an in-memory job queue.
 */
export function scheduleIngestion(ingestionId: string, config: WebhookRouteConfig): void {
  setImmediate(() => {
    void processIngestion(ingestionId, config)
  })
}
