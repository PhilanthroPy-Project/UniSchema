import type { WebhookRouteConfig } from '../middleware/webhookHandler.js'

export type SignatureVerificationDecision =
  | { action: 'verify'; secret: string }
  | { action: 'skip' }
  | { action: 'misconfigured' }

/** Determines whether incoming webhooks must pass HMAC verification. */
export function resolveSignatureVerification(
  config: WebhookRouteConfig,
): SignatureVerificationDecision {
  if (!config.secretEnvKey) {
    return { action: 'skip' }
  }

  const secret = process.env[config.secretEnvKey]

  if (secret) {
    return { action: 'verify', secret }
  }

  const required =
    process.env.NODE_ENV === 'production' ||
    process.env.WEBHOOK_SIGNATURE_REQUIRED === 'true'

  if (required) {
    return { action: 'misconfigured' }
  }

  return { action: 'skip' }
}
