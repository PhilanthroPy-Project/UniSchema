import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { createWebhookHandler } from './middleware/webhookHandler.js'
import * as cventMapper from './mappers/cvent.js'
import * as giveCampusMapper from './mappers/givecampus.js'
import { handleMappingSync } from './routes/mappingsSync.js'

const app = new Hono()

app.use(
  '/mappings/*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

app.post(
  '/webhooks/cvent',
  createWebhookHandler({
    vendor: 'cvent',
    mapToMaster: (rawPayload) => cventMapper.mapCventToMaster(rawPayload),
    failureMessage: 'Failed to map Cvent payload to master schema',
  }),
)

app.post(
  '/webhooks/givecampus',
  createWebhookHandler({
    vendor: 'givecampus',
    mapToMaster: (rawPayload) => giveCampusMapper.mapGiveCampusToMaster(rawPayload),
    failureMessage: 'Failed to map GiveCampus payload to master schema',
  }),
)

app.post('/mappings/sync', handleMappingSync)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
