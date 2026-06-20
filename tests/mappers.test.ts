import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { mapCventToMaster } from '../src/mappers/cvent.js'
import { mapGiveCampusToMaster } from '../src/mappers/givecampus.js'

describe('mapCventToMaster', () => {
  it('maps a valid Cvent payload to the master schema', () => {
    const rawPayload = {
      AttendeeStub: 'attendee-12345',
      EmailAddress: 'jane.doe@university.edu',
      EventCode: 'REG-2026-GALA',
      FirstName: 'Jane',
      LastName: 'Doe',
      RegistrationStatus: 'Confirmed',
    }

    const result = mapCventToMaster(rawPayload)

    expect(result.constituentEmail).toBe('jane.doe@university.edu')
    expect(result.firstName).toBe('Jane')
    expect(result.lastName).toBe('Doe')
    expect(result.eventType).toBe('EVENT_REGISTRATION')
    expect(result.sourceSystem).toBe('CVENT')
    expect(result.payload).toEqual(rawPayload)
    expect(result.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(() => new Date(result.createdAt).toISOString()).not.toThrow()
  })

  it('throws a ZodError when required Cvent fields are missing', () => {
    const invalidPayload = {
      AttendeeStub: 'attendee-12345',
      EventCode: 'REG-2026-GALA',
    }

    expect(() => mapCventToMaster(invalidPayload)).toThrow(ZodError)

    try {
      mapCventToMaster(invalidPayload)
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError)

      if (error instanceof ZodError) {
        const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>
        expect(fieldErrors.EmailAddress).toBeDefined()
      }
    }
  })

  it('throws a ZodError when EmailAddress is malformed', () => {
    const invalidPayload = {
      AttendeeStub: 'attendee-12345',
      EmailAddress: 'not-an-email',
      EventCode: 'REG-2026-GALA',
    }

    expect(() => mapCventToMaster(invalidPayload)).toThrow(ZodError)

    try {
      mapCventToMaster(invalidPayload)
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError)

      if (error instanceof ZodError) {
        const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>
        expect(fieldErrors.EmailAddress).toBeDefined()
      }
    }
  })
})

describe('mapGiveCampusToMaster', () => {
  it('maps a valid GiveCampus payload to the master schema', () => {
    const rawPayload = {
      id: 'gc-999',
      donation_type: 'donation',
      value: 500.0,
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    }

    const result = mapGiveCampusToMaster(rawPayload)

    expect(result.constituentEmail).toBe('alumni@school.edu')
    expect(result.amount).toBe(500)
    expect(result.currency).toBe('USD')
    expect(result.eventType).toBe('DONATION')
    expect(result.sourceSystem).toBe('GIVECAMPUS')
    expect(result.payload).toEqual(rawPayload)
  })

  it('handles string-based numeric values correctly', () => {
    const rawPayload = {
      id: 'gc-1001',
      donation_type: 'donation',
      value: '1000.50',
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    }

    const result = mapGiveCampusToMaster(rawPayload)

    expect(result.amount).toBe(1000.5)
    expect(result.amount).toStrictEqual(1000.5)
  })

  it('throws a ZodError if value is unparseable', () => {
    const invalidPayload = {
      id: 'gc-1002',
      donation_type: 'donation',
      value: 'Five Hundred',
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    }

    expect(() => mapGiveCampusToMaster(invalidPayload)).toThrow(ZodError)
  })
})
