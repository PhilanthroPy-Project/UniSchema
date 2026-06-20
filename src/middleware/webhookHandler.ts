import type { Context } from 'hono'
import { ZodError } from 'zod'

import type { ConstituentEvent } from '../schema/master.js'
import { captureSchemaDrift, type DriftVendor } from '../utils/driftCapture.js'

export type WebhookRouteConfig = {
  readonly vendor: DriftVendor
  readonly mapToMaster: (rawPayload: unknown) => ConstituentEvent
  readonly failureMessage: string
}

type WebhookErrorBody =
  | {
      success: false
      message: string
      errors: ReturnType<ZodError['flatten']>
    }
  | {
      success: false
      message: string
    }

export function createWebhookHandler(config: WebhookRouteConfig) {
  return async (c: Context): Promise<Response> => {
    let rawPayload: unknown | undefined

    try {
      rawPayload = await c.req.json()
      const mapped = config.mapToMaster(rawPayload)

      return c.json(mapped, 200)
    } catch (error) {
      if (error instanceof ZodError) {
        if (rawPayload !== undefined) {
          void captureSchemaDrift(config.vendor, rawPayload, error)
        }

        const body: WebhookErrorBody = {
          success: false,
          message: config.failureMessage,
          errors: error.flatten(),
        }

        return c.json(body, 400)
      }

      const body: WebhookErrorBody = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown mapping error',
      }

      return c.json(body, 400)
    }
  }
}
