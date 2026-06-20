import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { VENDOR_WEBHOOK_CONFIGS } from './config/webhookRoutes.js'
import { createWebhookHandler } from './middleware/webhookHandler.js'
import { createWebhookGuardMiddleware } from './middleware/webhookGuard.js'
import {
  handleDriftAck,
  handleDriftList,
  handleEgressAck,
  handleEgressList,
  handleIngestionGet,
  handleMappingGet,
} from './routes/api.js'
import { handleHealth, handleVendorsList } from './routes/health.js'
import { handleMappingSync } from './routes/mappingsSync.js'
import { registerBundledFrontend } from './staticFrontend.js'

const app = new Hono()

const corsOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

function registerAdminRoutes(target: Hono): void {
  target.use(
    '/mappings/*',
    cors({
      origin: corsOrigins,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  target.get('/webhooks/ingestions/:id', handleIngestionGet)

  target.post('/mappings/sync', handleMappingSync)
  target.get('/mappings/:vendor', handleMappingGet)

  /** Legacy pull-based egress — prefer push via S3/local publisher in production. */
  target.get('/egress/events', handleEgressList)
  target.post('/egress/ack', handleEgressAck)

  target.get('/drift/events', handleDriftList)
  target.post('/drift/events/:id/ack', handleDriftAck)

  target.get('/vendors', handleVendorsList)
  target.get('/health', handleHealth)
}

const adminApi = new Hono()
registerAdminRoutes(adminApi)

app.route('/', adminApi)
/** Prefix for the bundled admin UI (Vite dev proxy and production build use /api). */
app.route('/api', adminApi)

const webhookGuard = createWebhookGuardMiddleware()

for (const config of Object.values(VENDOR_WEBHOOK_CONFIGS)) {
  app.post(`/webhooks/${config.vendor}`, webhookGuard, createWebhookHandler(config))
}

registerBundledFrontend(app)

export default app
