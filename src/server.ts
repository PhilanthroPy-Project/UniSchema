import { serve } from '@hono/node-server'

import app from './index.js'

const port = Number(process.env.PORT ?? 3000)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Webhook Unifier listening on http://localhost:${info.port}`)
  },
)
