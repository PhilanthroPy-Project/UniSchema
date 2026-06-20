import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import {
  ConstituentEventSchema,
  EventTypeSchema,
} from '../src/schema/master.js'
import { validConstituentEvent } from './fixtures/payloads.js'

describe('EventTypeSchema', () => {
  it.each(['EVENT_REGISTRATION', 'DONATION', 'EMAIL_CLICK'] as const)(
    'accepts valid event type %s',
    (eventType) => {
      expect(EventTypeSchema.parse(eventType)).toBe(eventType)
    },
  )

  it('rejects unknown event types', () => {
    expect(() => EventTypeSchema.parse('UNKNOWN')).toThrow(ZodError)
  })
})

describe('ConstituentEventSchema', () => {
  it('accepts a fully populated valid event', () => {
    const result = ConstituentEventSchema.parse(validConstituentEvent)

    expect(result).toEqual(validConstituentEvent)
  })

  it('accepts events without optional name and donation fields', () => {
    const result = ConstituentEventSchema.parse({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      constituentEmail: 'alumni@school.edu',
      eventType: 'EVENT_REGISTRATION',
      sourceSystem: 'CVENT',
      payload: {},
      createdAt: '2026-06-20T12:00:00.000Z',
    })

    expect(result.firstName).toBeUndefined()
    expect(result.amount).toBeUndefined()
  })

  it('rejects malformed UUIDs', () => {
    expect(() =>
      ConstituentEventSchema.parse({
        ...validConstituentEvent,
        eventId: 'not-a-uuid',
      }),
    ).toThrow(ZodError)
  })

  it('rejects malformed constituent emails', () => {
    expect(() =>
      ConstituentEventSchema.parse({
        ...validConstituentEvent,
        constituentEmail: 'not-an-email',
      }),
    ).toThrow(ZodError)
  })

  it('rejects invalid ISO datetimes', () => {
    expect(() =>
      ConstituentEventSchema.parse({
        ...validConstituentEvent,
        createdAt: 'June 20, 2026',
      }),
    ).toThrow(ZodError)
  })

  it('rejects non-object payloads', () => {
    expect(() =>
      ConstituentEventSchema.parse({
        ...validConstituentEvent,
        payload: 'invalid',
      }),
    ).toThrow(ZodError)
  })
})
