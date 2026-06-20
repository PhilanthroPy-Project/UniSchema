import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { VENDOR_WEBHOOK_CONFIGS } from './config/webhookRoutes.js'
import { initDatabase } from './db/client.js'
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
import { handleMappingSync } from './routes/mappingsSync.js'

initDatabase()

const app = new Hono()

app.use(
  '/mappings/*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

const webhookGuard = createWebhookGuardMiddleware()

app.post('/webhooks/cvent', webhookGuard, createWebhookHandler(VENDOR_WEBHOOK_CONFIGS.cvent))

app.post(
  '/webhooks/givecampus',
  webhookGuard,
  createWebhookHandler(VENDOR_WEBHOOK_CONFIGS.givecampus),
)

app.get('/webhooks/ingestions/:id', handleIngestionGet)

app.post('/mappings/sync', handleMappingSync)
app.get('/mappings/:vendor', handleMappingGet)

/** Legacy pull-based egress — prefer push via S3/local publisher in production. */
app.get('/egress/events', handleEgressList)
app.post('/egress/ack', handleEgressAck)

app.get('/drift/events', handleDriftList)
app.post('/drift/events/:id/ack', handleDriftAck)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
