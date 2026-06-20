import type { WebhookRouteConfig } from '../middleware/webhookHandler.js'
import { processIngestion } from '../middleware/webhookHandler.js'
import { VENDOR_WEBHOOK_CONFIGS } from '../config/webhookRoutes.js'
import { getDatabaseDialect } from '../db/client.js'
import { logError, logInfo } from '../utils/logger.js'

type PgBossInstance = {
  start: () => Promise<void>
  createQueue: (name: string) => Promise<void>
  send: (name: string, data: { ingestionId: string; vendor: string }) => Promise<string | null>
  work: (
    name: string,
    handler: (jobs: Array<{ data: { ingestionId: string; vendor: string } }>) => Promise<void>,
  ) => Promise<void>
}

let pgBoss: PgBossInstance | null = null
let pgBossInitAttempted = false
const INGEST_QUEUE = 'unischema-ingest'

async function getPgBoss(): Promise<PgBossInstance | null> {
  if (getDatabaseDialect() !== 'postgres') {
    return null
  }

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
    return null
  }

  if (process.env.INGEST_QUEUE_ENABLED === 'false') {
    return null
  }

  if (pgBossInitAttempted) {
    return pgBoss
  }

  pgBossInitAttempted = true

  try {
    const pgBossModule = await import('pg-boss')
    const PgBossCtor = pgBossModule.default
    const boss = new PgBossCtor(databaseUrl) as unknown as PgBossInstance
    await boss.start()
    await boss.createQueue(INGEST_QUEUE)

    void boss.work(INGEST_QUEUE, async (jobs) => {
      for (const job of jobs) {
        const fullConfig = VENDOR_WEBHOOK_CONFIGS[job.data.vendor as keyof typeof VENDOR_WEBHOOK_CONFIGS]

        if (!fullConfig) {
          logError('[ingest-queue] unknown vendor', { vendor: job.data.vendor })
          continue
        }

        await processIngestion(job.data.ingestionId, fullConfig)
      }
    })

    pgBoss = boss
    logInfo('[ingest-queue] pg-boss worker started')
    return boss
  } catch (error) {
    logError('[ingest-queue] pg-boss init failed — falling back to setImmediate', {
      error: error instanceof Error ? error.message : String(error),
    })
    pgBoss = null
    return null
  }
}

/**
 * Schedules background ingestion.
 * Uses pg-boss when Postgres is configured; otherwise setImmediate.
 */
export function scheduleIngestion(ingestionId: string, config: WebhookRouteConfig): void {
  void (async () => {
    const boss = await getPgBoss()

    if (boss) {
      await boss.send(INGEST_QUEUE, { ingestionId, vendor: config.vendor })
      return
    }

    setImmediate(() => {
      void processIngestion(ingestionId, config).catch((error) => {
        logError('[ingestion] background processing failed', {
          ingestionId,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    })
  })()
}

/** Pending ingestions not yet claimed — for health metrics. */
export async function countPendingIngestions(): Promise<number> {
  const { countPendingIngestionRows } = await import('../db/unified.js')
  return countPendingIngestionRows()
}
