import { serve } from '@hono/node-server'

import app from './index.js'
import { recoverPendingEgress, recoverPendingIngestions } from './store/recoveryWorker.js'

const port = Number(process.env.PORT ?? 3000)

void Promise.all([recoverPendingIngestions(), recoverPendingEgress()]).then(
  ([ingestionsRecovered, egressRecovered]) => {
    if (ingestionsRecovered > 0) {
      console.log(`Recovered ${ingestionsRecovered} stale pending ingestion(s)`)
    }

    if (egressRecovered > 0) {
      console.log(`Recovered ${egressRecovered} pending egress event(s)`)
    }
  },
)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Webhook Unifier listening on http://localhost:${info.port}`)
  },
)
