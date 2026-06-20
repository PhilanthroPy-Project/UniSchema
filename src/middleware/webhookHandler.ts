import type { Context } from 'hono'
import { ZodError } from 'zod'

import { mapVendorPayload } from '../mappers/resolve.js'
import { persistConstituentEvent, acknowledgeEgressEvents } from '../store/egressStore.js'
import {
  completeIngestion,
  createIngestion,
  failIngestion,
  tryClaimIngestion,
} from '../store/ingestionQueue.js'
import { scheduleIngestion } from '../store/ingestionWorker.js'
import { getMapping } from '../store/mappingRegistry.js'
import { captureSchemaDrift, isDriftCaptureEnabled, type DriftVendor } from '../utils/driftCapture.js'
import { logError, logInfo } from '../utils/logger.js'
import { resolveSignatureVerification } from '../utils/webhookAuth.js'
import {
  readWebhookSignatureHeader,
  verifyWebhookSignature,
} from '../utils/webhookSignature.js'
import { isEgressEnabled } from '../egress/config.js'
import { publishEgressEvent } from '../egress/publisher.js'

export type WebhookRouteConfig = {
  readonly vendor: DriftVendor
  readonly failureMessage: string
  readonly secretEnvKey?: string
  readonly signatureHeader?: string
}

type WebhookAcceptedBody = {
  accepted: true
  ingestionId: string
}

type WebhookErrorBody = {
  success: false
  message: string
}

export async function processIngestion(
  ingestionId: string,
  config: WebhookRouteConfig,
): Promise<void> {
  const ingestion = await tryClaimIngestion(ingestionId)

  if (!ingestion) {
    return
  }

  try {
    const mapped = await mapVendorPayload(config.vendor, ingestion.rawPayload)
    const record = await persistConstituentEvent(mapped, config.vendor)

    if (isEgressEnabled()) {
      try {
        const published = await publishEgressEvent(record)

        await acknowledgeEgressEvents([record.id])
        logInfo('[egress] published constituent event', {
          eventId: record.eventId,
          vendor: record.vendor,
          location: published.location,
          target: published.target,
          ingestionId,
        })
      } catch (error) {
        logError('[egress] failed to publish constituent event', {
          eventId: record.eventId,
          vendor: record.vendor,
          ingestionId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    await completeIngestion(ingestionId, mapped)
  } catch (error) {
    if (error instanceof ZodError) {
      if (isDriftCaptureEnabled()) {
        const storedMapping = await getMapping(config.vendor)
        const usesDynamicMapper =
          storedMapping !== undefined && storedMapping.mappings.length > 0

        const driftResult = await captureSchemaDrift(
          config.vendor,
          ingestion.rawPayload,
          error,
          usesDynamicMapper
            ? { mapperKind: 'dynamic', mappingArtifact: storedMapping }
            : { mapperKind: 'builtin' },
        )

        if (driftResult.captured) {
          logInfo('[drift-capture] enqueued schema drift event', {
            vendor: config.vendor,
            ingestionId,
            driftEventId: driftResult.driftEventId,
            basename: driftResult.basename,
          })
        }
      }

      await failIngestion(ingestionId, {
        message: config.failureMessage,
        errors: error.flatten(),
      })
      return
    }

    await failIngestion(ingestionId, {
      message: error instanceof Error ? error.message : 'Unknown mapping error',
    })
  }
}

export function createWebhookHandler(config: WebhookRouteConfig) {
  return async (c: Context): Promise<Response> => {
    const rawBody = await c.req.text()
    const signatureDecision = resolveSignatureVerification(config)

    if (signatureDecision.action === 'misconfigured') {
      const body: WebhookErrorBody = {
        success: false,
        message: 'Webhook secret not configured',
      }
      return c.json(body, 500)
    }

    if (signatureDecision.action === 'verify') {
      const signature = readWebhookSignatureHeader(
        (name) => c.req.header(name),
        config.signatureHeader,
      )

      if (!verifyWebhookSignature(signatureDecision.secret, rawBody, signature)) {
        const body: WebhookErrorBody = {
          success: false,
          message: 'Invalid webhook signature',
        }
        return c.json(body, 401)
      }
    }

    let rawPayload: unknown

    try {
      rawPayload = rawBody.length > 0 ? JSON.parse(rawBody) : null
    } catch {
      const body: WebhookErrorBody = {
        success: false,
        message: 'Request body must be valid JSON',
      }
      return c.json(body, 400)
    }

    if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
      const body: WebhookErrorBody = {
        success: false,
        message: 'Webhook payload must be a JSON object',
      }
      return c.json(body, 400)
    }

    const ingestion = await createIngestion(config.vendor, rawPayload)

    scheduleIngestion(ingestion.id, config)

    const body: WebhookAcceptedBody = {
      accepted: true,
      ingestionId: ingestion.id,
    }

    return c.json(body, 202)
  }
}
