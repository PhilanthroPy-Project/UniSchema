import { describe, expect, it } from 'vitest'

import { mapWithArtifact, getValueAtPath } from '../../src/mappers/dynamic.js'
import { validGiveCampusPayload } from '../fixtures/payloads.js'

describe('getValueAtPath', () => {
  it('reads nested payload paths', () => {
    const payload = { donor: { email: 'a@b.edu' } }

    expect(getValueAtPath(payload, 'donor.email')).toBe('a@b.edu')
  })

  it('returns undefined for missing or invalid paths', () => {
    expect(getValueAtPath({ donor: { email: 'a@b.edu' } }, 'donor.missing')).toBeUndefined()
    expect(getValueAtPath({ tags: ['a'] }, 'tags.extra')).toBeUndefined()
  })
})

describe('mapWithArtifact', () => {
  it('maps admin-defined fields and metadata', () => {
    const result = mapWithArtifact(validGiveCampusPayload, {
      vendor: 'GiveCampus',
      exportedAt: '2026-06-20T12:00:00.000Z',
      mappings: [
        { source: 'donor_email', target: 'constituentEmail' },
        { source: 'value', target: 'amount' },
        { source: 'currency', target: 'currency' },
      ],
      metadataMappings: [{ source: 'donation_type', key: 'donationType' }],
    })

    expect(result.constituentEmail).toBe('alumni@school.edu')
    expect(result.amount).toBe(500)
    expect(result.currency).toBe('USD')
    expect(result.eventType).toBe('DONATION')
    expect(result.normalizedMetadata).toEqual({ donationType: 'donation' })
  })

  it('coerces string amounts and rejects invalid values', () => {
    const result = mapWithArtifact(
      { ...validGiveCampusPayload, value: '1,000.50' },
      {
        vendor: 'GiveCampus',
        exportedAt: '2026-06-20T12:00:00.000Z',
        mappings: [
          { source: 'donor_email', target: 'constituentEmail' },
          { source: 'value', target: 'amount' },
        ],
        metadataMappings: [],
      },
    )

    expect(result.amount).toBe(1000.5)
  })

  it('throws when the payload is not an object', () => {
    expect(() =>
      mapWithArtifact('invalid', {
        vendor: 'GiveCampus',
        exportedAt: '2026-06-20T12:00:00.000Z',
        mappings: [{ source: 'donor_email', target: 'constituentEmail' }],
        metadataMappings: [],
      }),
    ).toThrow('Webhook payload must be a JSON object')
  })

  it('defaults Slate to EVENT_REGISTRATION when eventType is not mapped', () => {
    const result = mapWithArtifact(
      {
        id: 'slate-reg-2026-001',
        email: 'prospect@university.edu',
        first: 'Jordan',
        last: 'Lee',
      },
      {
        vendor: 'Slate',
        exportedAt: '2026-06-20T12:00:00.000Z',
        mappings: [{ source: 'email', target: 'constituentEmail' }],
        metadataMappings: [{ source: 'form', key: 'form' }],
      },
    )

    expect(result.eventType).toBe('EVENT_REGISTRATION')
    expect(result.normalizedMetadata).toEqual({ form: null })
  })

  it('defaults unknown vendors to EVENT_REGISTRATION and resolves fallback vendor ids', () => {
    expect(() =>
      mapWithArtifact(
        { custom_field: 'abc123', donor_email: 'alumni@school.edu' },
        {
          vendor: 'NewVendor',
          exportedAt: '2026-06-20T12:00:00.000Z',
          mappings: [{ source: 'donor_email', target: 'constituentEmail' }],
          metadataMappings: [{ source: 'custom_field', key: 'customField' }],
        },
      ),
    ).toThrow(/Unsupported vendor/)
  })

  it('rejects invalid mapped amounts and event types', () => {
    expect(() =>
      mapWithArtifact(
        { ...validGiveCampusPayload, value: 'not-a-number' },
        {
          vendor: 'GiveCampus',
          exportedAt: '2026-06-20T12:00:00.000Z',
          mappings: [
            { source: 'donor_email', target: 'constituentEmail' },
            { source: 'value', target: 'amount' },
          ],
          metadataMappings: [],
        },
      ),
    ).toThrow()

    expect(() =>
      mapWithArtifact(
        { ...validGiveCampusPayload, donation_type: 'UNKNOWN' },
        {
          vendor: 'GiveCampus',
          exportedAt: '2026-06-20T12:00:00.000Z',
          mappings: [
            { source: 'donor_email', target: 'constituentEmail' },
            { source: 'donation_type', target: 'eventType' },
          ],
          metadataMappings: [],
        },
      ),
    ).toThrow()
  })
})
