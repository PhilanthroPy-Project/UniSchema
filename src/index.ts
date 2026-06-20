import { Hono } from 'hono'

import { createWebhookHandler } from './middleware/webhookHandler.js'
import * as cventMapper from './mappers/cvent.js'
import * as giveCampusMapper from './mappers/givecampus.js'

const app = new Hono()

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

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
