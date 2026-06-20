import type { WebhookRouteConfig } from '../middleware/webhookHandler.js'
import type { DriftVendor } from '../utils/driftCapture.js'

export const VENDOR_WEBHOOK_CONFIGS: Record<DriftVendor, WebhookRouteConfig> = {
  cvent: {
    vendor: 'cvent',
    failureMessage: 'Failed to map Cvent payload to master schema',
    secretEnvKey: 'CVENT_WEBHOOK_SECRET',
    signatureHeader: 'x-cvent-signature',
  },
  givecampus: {
    vendor: 'givecampus',
    failureMessage: 'Failed to map GiveCampus payload to master schema',
    secretEnvKey: 'GIVECAMPUS_WEBHOOK_SECRET',
    signatureHeader: 'x-givecampus-signature',
  },
}
