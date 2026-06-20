import type { Context } from 'hono'
import { z } from 'zod'

import {
  getDriftEvent,
  listDriftEvents,
  markDriftEventProcessed,
} from '../store/driftQueue.js'
import { listPendingEgressEvents, acknowledgeEgressEvents } from '../store/egressStore.js'
import { getIngestion } from '../store/ingestionQueue.js'
import { getMapping } from '../store/mappingRegistry.js'
import { isDriftVendor, type DriftVendor } from '../utils/driftCapture.js'
import { isDriftAgentAuthorized, isDriftListAuthorized, resolveDriftListAuth } from '../utils/driftAgentAuth.js'
import { isEgressPullAuthorized, resolveEgressPullAuth } from '../utils/egressPullAuth.js'
import { isMappingSyncAuthorized, resolveMappingSyncAuth } from '../utils/mappingSyncAuth.js'

const EgressAckSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function handleMappingGet(c: Context): Promise<Response> {
  const authDecision = resolveMappingSyncAuth()

  if (authDecision.action === 'misconfigured') {
    return c.json({ success: false, message: 'Mapping sync token not configured' }, 500)
  }

  if (!isMappingSyncAuthorized(c)) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const vendor = c.req.param('vendor')

  if (!vendor?.trim()) {
    return c.json({ success: false, message: 'Vendor is required' }, 400)
  }

  const stored = await getMapping(vendor)

  if (!stored) {
    return c.json({ success: false, message: `No mapping found for vendor "${vendor}"` }, 404)
  }

  return c.json({
    success: true,
    mapping: {
      vendor: stored.vendor,
      exportedAt: stored.exportedAt,
      mappings: stored.mappings,
      metadataMappings: stored.metadataMappings ?? [],
      syncedAt: stored.syncedAt,
    },
  })
}

export async function handleEgressList(c: Context): Promise<Response> {
  const authDecision = resolveEgressPullAuth()

  if (authDecision.action === 'misconfigured') {
    return c.json({ success: false, message: 'Egress pull token not configured' }, 500)
  }

  if (!isEgressPullAuthorized(c)) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const limitParam = c.req.query('limit')
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 100

  if (Number.isNaN(limit) || limit < 1 || limit > 500) {
    return c.json({ success: false, message: 'limit must be between 1 and 500' }, 400)
  }

  const events = await listPendingEgressEvents(limit)

  return c.json({
    success: true,
    count: events.length,
    events: events.map((record) => ({
      id: record.id,
      eventId: record.eventId,
      vendor: record.vendor,
      event: record.event,
      createdAt: record.createdAt,
    })),
  })
}

export async function handleEgressAck(c: Context): Promise<Response> {
  const authDecision = resolveEgressPullAuth()

  if (authDecision.action === 'misconfigured') {
    return c.json({ success: false, message: 'Egress pull token not configured' }, 500)
  }

  if (!isEgressPullAuthorized(c)) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  let rawBody: unknown

  try {
    rawBody = await c.req.json()
  } catch {
    return c.json({ success: false, message: 'Request body must be valid JSON' }, 400)
  }

  const parsed = EgressAckSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: 'Invalid ack payload',
        errors: parsed.error.flatten(),
      },
      400,
    )
  }

  const acknowledged = await acknowledgeEgressEvents(parsed.data.ids)

  return c.json({ success: true, acknowledged })
}

export async function handleIngestionGet(c: Context): Promise<Response> {
  const authDecision = resolveMappingSyncAuth()

  if (authDecision.action === 'misconfigured') {
    return c.json({ success: false, message: 'Mapping sync token not configured' }, 500)
  }

  if (!isMappingSyncAuthorized(c)) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const ingestionId = c.req.param('id')

  if (!ingestionId) {
    return c.json({ success: false, message: 'Ingestion id is required' }, 400)
  }

  const ingestion = await getIngestion(ingestionId)

  if (!ingestion) {
    return c.json({ success: false, message: 'Ingestion not found' }, 404)
  }

  return c.json({
    success: true,
    ingestion: {
      id: ingestion.id,
      vendor: ingestion.vendor,
      status: ingestion.status,
      result: ingestion.result,
      error: ingestion.error,
      createdAt: ingestion.createdAt,
      completedAt: ingestion.completedAt,
    },
  })
}

export async function handleDriftList(c: Context): Promise<Response> {
  const authDecision = resolveDriftListAuth()

  if (authDecision.action === 'misconfigured') {
    return c.json({ success: false, message: 'Drift agent token not configured' }, 500)
  }

  if (!isDriftListAuthorized(c)) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const vendor = c.req.query('vendor')
  const statusParam = c.req.query('status')
  const includePayload = c.req.query('includePayload') === 'true'
  const agentAuthorized = isDriftAgentAuthorized(c)

  if (vendor && !isDriftVendor(vendor)) {
    return c.json({ success: false, message: 'Invalid vendor' }, 400)
  }

  if (statusParam && statusParam !== 'pending' && statusParam !== 'processed') {
    return c.json({ success: false, message: 'status must be pending or processed' }, 400)
  }

  if (includePayload && !agentAuthorized) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const events = await listDriftEvents(
    vendor as DriftVendor | undefined,
    50,
    statusParam as 'pending' | 'processed' | undefined,
  )

  return c.json({
    success: true,
    count: events.length,
    events: events.map((event) => ({
      id: event.id,
      vendor: event.vendor,
      capturedAt: event.capturedAt,
      status: event.status,
      validationErrors: event.validationErrors,
      mapperKind: event.mapperKind,
      localFixturePath: event.localFixturePath,
      ...(includePayload ? { rawPayload: event.rawPayload } : {}),
    })),
  })
}

export async function handleDriftAck(c: Context): Promise<Response> {
  if (!isDriftAgentAuthorized(c)) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const driftEventId = c.req.param('id')

  if (!driftEventId) {
    return c.json({ success: false, message: 'Drift event id is required' }, 400)
  }

  const event = await getDriftEvent(driftEventId)

  if (!event) {
    return c.json({ success: false, message: 'Drift event not found' }, 404)
  }

  await markDriftEventProcessed(driftEventId)

  return c.json({ success: true, id: driftEventId, status: 'processed' })
}
