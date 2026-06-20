import { createHmac, timingSafeEqual } from 'node:crypto'

/** Computes the HMAC SHA-256 hex digest for a raw webhook body. */
export function computeWebhookHmacSha256(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

function normalizeSignatureHeader(signatureHeader: string): string {
  const trimmed = signatureHeader.trim()

  if (trimmed.startsWith('sha256=')) {
    return trimmed.slice('sha256='.length)
  }

  return trimmed
}

/** Verifies an incoming webhook signature against the raw request body. */
export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader) {
    return false
  }

  const expected = computeWebhookHmacSha256(secret, rawBody)
  const provided = normalizeSignatureHeader(signatureHeader)

  try {
    const expectedBuffer = Buffer.from(expected, 'hex')
    const providedBuffer = Buffer.from(provided, 'hex')

    if (expectedBuffer.length !== providedBuffer.length) {
      return false
    }

    return timingSafeEqual(expectedBuffer, providedBuffer)
  } catch {
    return false
  }
}

export const DEFAULT_WEBHOOK_SIGNATURE_HEADER = 'x-signature'

export const WEBHOOK_SIGNATURE_HEADERS = [
  DEFAULT_WEBHOOK_SIGNATURE_HEADER,
  'x-givecampus-signature',
  'x-cvent-signature',
  'x-hub-signature-256',
] as const

/** Reads the first present signature header from a Hono-style header map. */
export function readWebhookSignatureHeader(
  getHeader: (name: string) => string | undefined,
  preferredHeader?: string,
): string | undefined {
  const candidates = preferredHeader
    ? [preferredHeader, ...WEBHOOK_SIGNATURE_HEADERS.filter((header) => header !== preferredHeader)]
    : [...WEBHOOK_SIGNATURE_HEADERS]

  for (const headerName of candidates) {
    const value = getHeader(headerName)

    if (value) {
      return value
    }
  }

  return undefined
}
