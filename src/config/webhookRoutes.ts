import type { WebhookRouteConfig } from '../middleware/webhookHandler.js'
import type { DriftVendor } from '../utils/driftCapture.js'

/** Webhook route registry — adding a vendor? See docs/adding-a-vendor.md */
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
  imodules: {
    vendor: 'imodules',
    failureMessage: 'Failed to map iModules payload to master schema',
    secretEnvKey: 'IMODULES_WEBHOOK_SECRET',
    signatureHeader: 'x-imodules-signature',
  },
  blackbaud: {
    vendor: 'blackbaud',
    failureMessage: 'Failed to map Blackbaud payload to master schema',
    secretEnvKey: 'BLACKBAUD_WEBHOOK_SECRET',
    signatureHeader: 'x-blackbaud-signature',
  },
  npsp: {
    vendor: 'npsp',
    failureMessage: 'Failed to map NPSP payload to master schema',
    secretEnvKey: 'NPSP_WEBHOOK_SECRET',
    signatureHeader: 'x-npsp-signature',
  },
}

export const VENDOR_REGISTRY = Object.values(VENDOR_WEBHOOK_CONFIGS).map((config) => ({
  slug: config.vendor,
  label: config.vendor.charAt(0).toUpperCase() + config.vendor.slice(1),
  webhookPath: `/webhooks/${config.vendor}`,
  hasSample: true,
}))
