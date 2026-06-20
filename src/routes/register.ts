import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { VENDOR_WEBHOOK_CONFIGS } from '../config/webhookRoutes.js'
import { createWebhookHandler } from '../middleware/webhookHandler.js'
import { createWebhookGuardMiddleware } from '../middleware/webhookGuard.js'
import {
  handleDriftAck,
  handleDriftList,
  handleEgressAck,
  handleEgressList,
  handleIngestionGet,
  handleMappingGet,
} from './api.js'
import { handleHealth, handleVendorsList } from './health.js'
import { handleMappingPreview } from './mappingPreview.js'
import { handleMappingSync } from './mappingsSync.js'

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
  target.post('/mappings/preview', handleMappingPreview)
  target.get('/mappings/:vendor', handleMappingGet)

  /** Legacy pull-based egress — prefer push via S3/local publisher in production. */
  target.get('/egress/events', handleEgressList)
  target.post('/egress/ack', handleEgressAck)

  target.get('/drift/events', handleDriftList)
  target.post('/drift/events/:id/ack', handleDriftAck)

  target.get('/vendors', handleVendorsList)
  target.get('/health', handleHealth)
}

/** Mount admin, webhook, and API-prefixed routes on the root Hono app. */
export function registerRoutes(app: Hono): void {
  const adminApi = new Hono()
  registerAdminRoutes(adminApi)

  app.route('/', adminApi)
  /** Prefix for the bundled admin UI (Vite dev proxy and production build use /api). */
  app.route('/api', adminApi)

  const webhookGuard = createWebhookGuardMiddleware()

  for (const config of Object.values(VENDOR_WEBHOOK_CONFIGS)) {
    app.post(`/webhooks/${config.vendor}`, webhookGuard, createWebhookHandler(config))
  }
}
