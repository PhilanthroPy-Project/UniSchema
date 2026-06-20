import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { mapCventToMaster } from '../src/mappers/cvent.js'

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
})
