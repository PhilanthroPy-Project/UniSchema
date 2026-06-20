import type { Context } from 'hono'
import { z } from 'zod'

import { getMapping } from '../store/mappingRegistry.js'
import { listDriftEvents } from '../store/driftQueue.js'
import { listPendingEgressEvents, acknowledgeEgressEvents } from '../store/egressStore.js'
import { getIngestion } from '../store/ingestionQueue.js'
import { isDriftVendor, type DriftVendor } from '../utils/driftCapture.js'

const EgressAckSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function handleMappingGet(c: Context): Promise<Response> {
  const vendor = c.req.param('vendor')

  if (!vendor?.trim()) {
    return c.json({ success: false, message: 'Vendor is required' }, 400)
  }

  const stored = getMapping(vendor)

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
  const limitParam = c.req.query('limit')
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 100

  if (Number.isNaN(limit) || limit < 1 || limit > 500) {
    return c.json({ success: false, message: 'limit must be between 1 and 500' }, 400)
  }

  const events = listPendingEgressEvents(limit)

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

  const acknowledged = acknowledgeEgressEvents(parsed.data.ids)

  return c.json({ success: true, acknowledged })
}

export async function handleIngestionGet(c: Context): Promise<Response> {
  const ingestionId = c.req.param('id')

  if (!ingestionId) {
    return c.json({ success: false, message: 'Ingestion id is required' }, 400)
  }

  const ingestion = getIngestion(ingestionId)

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
  const vendor = c.req.query('vendor')

  if (vendor && !isDriftVendor(vendor)) {
    return c.json({ success: false, message: 'Invalid vendor' }, 400)
  }

  const events = listDriftEvents(vendor as DriftVendor | undefined)

  return c.json({
    success: true,
    count: events.length,
    events: events.map((event) => ({
      id: event.id,
      vendor: event.vendor,
      capturedAt: event.capturedAt,
      status: event.status,
      validationErrors: event.validationErrors,
      localFixturePath: event.localFixturePath,
    })),
  })
}
