import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { computeDriftSignature } from '../../src/store/driftQueue.js'
import { summarizeDriftRootCause } from '../../src/utils/driftCapture.js'
import { computeMttrSeconds, computeRate } from '../../src/routes/health.js'
import { ConstituentEventSchema } from '../../src/schema/master.js'

function zodError(path: string[], code = 'invalid_type'): ZodError {
  return new ZodError([
    { code, expected: 'string', path, message: 'bad' } as never,
  ])
}

describe('computeDriftSignature', () => {
  it('is stable across payloads that fail the same way', () => {
    const a = computeDriftSignature('cvent', zodError(['EmailAddress']))
    const b = computeDriftSignature('cvent', zodError(['EmailAddress']))

    expect(a).toBe(b)
  })

  it('differs by vendor and by failing field', () => {
    const base = computeDriftSignature('cvent', zodError(['EmailAddress']))

    expect(computeDriftSignature('givecampus', zodError(['EmailAddress']))).not.toBe(base)
    expect(computeDriftSignature('cvent', zodError(['Amount']))).not.toBe(base)
  })
})

describe('summarizeDriftRootCause', () => {
  it('renders field errors as a one-line summary', () => {
    const summary = summarizeDriftRootCause({
      formErrors: [],
      fieldErrors: { amount: ['Expected number, received string'], email: ['Required'] },
    })

    expect(summary).toBe('amount: Expected number, received string; email: Required')
  })

  it('falls back when there are no field errors', () => {
    expect(summarizeDriftRootCause({ formErrors: [], fieldErrors: {} })).toBe(
      'No field-level validation errors captured',
    )
  })
})

describe('computeRate', () => {
  it('rounds to 4dp and returns null on an empty denominator', () => {
    expect(computeRate(1, 2)).toBe(0.5)
    expect(computeRate(0, 5)).toBe(0)
    expect(computeRate(3, 0)).toBeNull()
  })
})

describe('computeMttrSeconds', () => {
  it('returns the median duration in seconds', () => {
    const pairs = [
      { capturedAt: '2026-01-01T00:00:00.000Z', processedAt: '2026-01-01T00:00:10.000Z' },
      { capturedAt: '2026-01-01T00:00:00.000Z', processedAt: '2026-01-01T00:00:30.000Z' },
      { capturedAt: '2026-01-01T00:00:00.000Z', processedAt: '2026-01-01T00:00:20.000Z' },
    ]

    expect(computeMttrSeconds(pairs)).toBe(20)
  })

  it('returns null when nothing has been processed', () => {
    expect(computeMttrSeconds([])).toBeNull()
  })
})

describe('constituentEmail canonicalization', () => {
  it('trims and lowercases so re-ingested events share one donor key', () => {
    const event = ConstituentEventSchema.parse({
      eventId: '00000000-0000-4000-8000-000000000000',
      constituentEmail: '  Jane.Doe@University.EDU ',
      eventType: 'DONATION',
      sourceSystem: 'CVENT',
      payload: {},
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    expect(event.constituentEmail).toBe('jane.doe@university.edu')
  })
})
