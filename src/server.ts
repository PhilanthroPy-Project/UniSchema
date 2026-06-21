import { serve } from '@hono/node-server'

import { getDatabaseDialect, initDatabase, initPostgresDatabase } from './db/client.js'
import { resolveEgressConfig } from './egress/config.js'
import { flushS3Buffer } from './egress/s3Publisher.js'
import { recoverPendingEgress, recoverPendingIngestions } from './store/recoveryWorker.js'
import {
  formatConfigValidationError,
  validateProductionConfig,
} from './utils/configValidation.js'
import { logError } from './utils/logger.js'
import { initOidcJwks } from './utils/oidcAuth.js'

const port = Number(process.env.PORT ?? 3000)

async function shutdown(): Promise<void> {
  const egress = resolveEgressConfig()

  if (egress.target === 's3' && egress.s3Bucket) {
    try {
      await flushS3Buffer(egress)
      console.log('Flushed S3 egress buffer on shutdown')
    } catch (error) {
      logError('[shutdown] S3 buffer flush failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

async function bootstrap(): Promise<void> {
  const configIssues = validateProductionConfig()

  if (configIssues.length > 0) {
    console.error(formatConfigValidationError(configIssues))
    process.exit(1)
  }

  await initOidcJwks()

  if (getDatabaseDialect() === 'postgres') {
    await initPostgresDatabase()
  } else {
    initDatabase()
  }

  const { default: app } = await import('./app.js')

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

  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0))
  })

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0))
  })
}

void bootstrap()
