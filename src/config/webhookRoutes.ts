import type { WebhookRouteConfig } from '../middleware/webhookHandler.js'
import type { DriftVendor } from '../utils/driftCapture.js'

export type VendorTier = 1 | 2 | 3

/** Vendor maturity tier — see docs/README.md for certification criteria. */
export const VENDOR_TIERS: Record<DriftVendor, VendorTier> = {
  givecampus: 1,
  cvent: 1,
  imodules: 2,
  blackbaud: 3,
  npsp: 3,
  slate: 3,
  ellucian: 3,
  civicrm: 3,
}

const VENDOR_LABELS: Record<DriftVendor, string> = {
  givecampus: 'GiveCampus',
  cvent: 'Cvent',
  imodules: 'iModules',
  blackbaud: 'Blackbaud',
  npsp: 'NPSP',
  slate: 'Slate',
  ellucian: 'Ellucian',
  civicrm: 'CiviCRM',
}
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
  slate: {
    vendor: 'slate',
    failureMessage: 'Failed to map Slate payload to master schema',
    secretEnvKey: 'SLATE_WEBHOOK_SECRET',
    signatureHeader: 'x-slate-signature',
  },
  ellucian: {
    vendor: 'ellucian',
    failureMessage: 'Failed to map Ellucian payload to master schema',
    secretEnvKey: 'ELLUCIAN_WEBHOOK_SECRET',
    signatureHeader: 'x-ellucian-signature',
  },
  civicrm: {
    vendor: 'civicrm',
    failureMessage: 'Failed to map CiviCRM payload to master schema',
    secretEnvKey: 'CIVICRM_WEBHOOK_SECRET',
    signatureHeader: 'x-civicrm-signature',
  },
}

export const VENDOR_REGISTRY = Object.values(VENDOR_WEBHOOK_CONFIGS).map((config) => ({
  slug: config.vendor,
  label: VENDOR_LABELS[config.vendor],
  tier: VENDOR_TIERS[config.vendor],
  webhookPath: `/webhooks/${config.vendor}`,
  hasSample: true,
}))
