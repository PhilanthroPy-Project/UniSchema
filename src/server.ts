import { serve } from '@hono/node-server'

import { getDatabaseDialect, initDatabase, initPostgresDatabase } from './db/client.js'
import { recoverPendingEgress, recoverPendingIngestions } from './store/recoveryWorker.js'
import { logError } from './utils/logger.js'

const port = Number(process.env.PORT ?? 3000)

async function bootstrap(): Promise<void> {
  if (getDatabaseDialect() === 'postgres') {
    await initPostgresDatabase()
  } else {
    initDatabase()
  }

  const { default: app } = await import('./index.js')

  void Promise.all([recoverPendingIngestions(), recoverPendingEgress()])
    .then(([ingestionsRecovered, egressRecovered]) => {
      if (ingestionsRecovered > 0) {
        console.log(`Recovered ${ingestionsRecovered} stale pending ingestion(s)`)
      }

      if (egressRecovered > 0) {
        console.log(`Recovered ${egressRecovered} pending egress event(s)`)
      }
    })
    .catch((error) => {
      logError('[recovery] startup recovery failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`Webhook Unifier listening on http://localhost:${info.port}`)
    },
  )
}

void bootstrap()
