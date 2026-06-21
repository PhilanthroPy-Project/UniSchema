import { createHash } from 'node:crypto'

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function redactString(value: string): string {
  return value.replace(EMAIL_PATTERN, (email) => `redacted+${hashValue(email.toLowerCase())}@example.com`)
}

/**
 * Redacts PII from drift fixtures before writing to git or CI artifacts.
 */
export function redactPayload(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return redactString(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactPayload(entry))
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const redacted: Record<string, unknown> = {}

    for (const [key, entry] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase()

      if (
        normalizedKey.includes('email') ||
        normalizedKey === 'first' ||
        normalizedKey === 'last' ||
        normalizedKey === 'firstname' ||
        normalizedKey === 'lastname' ||
        normalizedKey.includes('name')
      ) {
        if (typeof entry === 'string') {
          if (normalizedKey.includes('email')) {
            redacted[key] = `redacted+${hashValue(entry.toLowerCase())}@example.com`
          } else {
            redacted[key] = '[REDACTED]'
          }
          continue
        }
      }

      redacted[key] = redactPayload(entry)
    }

    return redacted
  }

  return value
}
