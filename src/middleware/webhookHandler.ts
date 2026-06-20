import type { Context } from 'hono'
import { ZodError } from 'zod'

import { mapVendorPayload } from '../mappers/resolve.js'
import { persistConstituentEvent, acknowledgeEgressEvents } from '../store/egressStore.js'
import {
  completeIngestion,
  createIngestion,
  failIngestion,
  getIngestion,
} from '../store/ingestionQueue.js'
import { captureSchemaDrift, isDriftCaptureEnabled, type DriftVendor } from '../utils/driftCapture.js'
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
  /** When set, verifies HMAC SHA-256 signature using `process.env[secretEnvKey]`. */
  readonly secretEnvKey?: string
  /** Signature header name; defaults to `x-signature` with fallbacks for common vendors. */
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
  const ingestion = getIngestion(ingestionId)

  if (!ingestion || ingestion.status !== 'pending') {
    return
  }

  try {
    const mapped = mapVendorPayload(config.vendor, ingestion.rawPayload)
    const record = persistConstituentEvent(mapped, config.vendor)

    if (isEgressEnabled()) {
      try {
        const published = await publishEgressEvent(record)

        acknowledgeEgressEvents([record.id])
        console.info('[egress] published constituent event', {
          eventId: record.eventId,
          vendor: record.vendor,
          location: published.location,
          target: published.target,
        })
      } catch (error) {
        console.error('[egress] failed to publish constituent event', {
          eventId: record.eventId,
          vendor: record.vendor,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    completeIngestion(ingestionId, mapped)
  } catch (error) {
    if (error instanceof ZodError) {
      if (isDriftCaptureEnabled()) {
        const driftResult = await captureSchemaDrift(config.vendor, ingestion.rawPayload, error)

        if (driftResult.captured) {
          console.info('[drift-capture] enqueued schema drift event', {
            vendor: config.vendor,
            ingestionId,
            driftEventId: driftResult.driftEventId,
            localWriteSkipped: driftResult.localWriteSkipped,
          })
        }
      }

      failIngestion(ingestionId, {
        message: config.failureMessage,
        errors: error.flatten(),
      })
      return
    }

    failIngestion(ingestionId, {
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

    const ingestion = createIngestion(config.vendor, rawPayload)

    queueMicrotask(() => {
      void processIngestion(ingestion.id, config)
    })

    const body: WebhookAcceptedBody = {
      accepted: true,
      ingestionId: ingestion.id,
    }

    return c.json(body, 202)
  }
}
