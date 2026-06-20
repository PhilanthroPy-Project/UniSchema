import { describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

import {
  ConstituentEventSchema,
} from '../../src/schema/master.js'
import { mapBlackbaudToMaster } from '../../src/mappers/blackbaud.js'
import { mapCventToMaster } from '../../src/mappers/cvent.js'
import { mapGiveCampusToMaster } from '../../src/mappers/givecampus.js'
import { mapImodulesToMaster } from '../../src/mappers/imodules.js'
import { mapNpspToMaster } from '../../src/mappers/npsp.js'
import { mapSlateToMaster } from '../../src/mappers/slate.js'
import {
  validBlackbaudPayload,
  validImodulesPayload,
  validNpspPayload,
  validSlatePayload,
} from '../fixtures/payloads.js'

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
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(() => new Date(result.createdAt).toISOString()).not.toThrow()
  })

  it('produces the same eventId when the same Cvent payload is retried', () => {
    const rawPayload = {
      AttendeeStub: 'attendee-12345',
      EmailAddress: 'jane.doe@university.edu',
      EventCode: 'REG-2026-GALA',
    }

    const first = mapCventToMaster(rawPayload)
    const second = mapCventToMaster(rawPayload)

    expect(first.eventId).toBe(second.eventId)
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

  it.each([
    ['DONATION-2026-ANNUAL', 'DONATION'],
    ['EMAIL-NEWSLETTER-MARCH', 'EMAIL_CLICK'],
    ['GALA-2026', 'EVENT_REGISTRATION'],
  ] as const)('maps EventCode %s to eventType %s', (eventCode, expectedEventType) => {
    const result = mapCventToMaster({
      AttendeeStub: 'attendee-12345',
      EmailAddress: 'jane.doe@university.edu',
      EventCode: eventCode,
    })

    expect(result.eventType).toBe(expectedEventType)
  })

  it('maps payloads without optional name fields', () => {
    const result = mapCventToMaster({
      AttendeeStub: 'attendee-12345',
      EmailAddress: 'jane.doe@university.edu',
      EventCode: 'REG-2026-GALA',
    })

    expect(result.firstName).toBeUndefined()
    expect(result.lastName).toBeUndefined()
  })

  it('throws a ZodError when the payload is not a JSON object', () => {
    expect(() => mapCventToMaster(null)).toThrow(ZodError)
    expect(() => mapCventToMaster(['invalid'])).toThrow(ZodError)
  })

  it('throws a ZodError when master schema validation fails unexpectedly', () => {
    const spy = vi.spyOn(ConstituentEventSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new ZodError([
        {
          code: 'custom',
          path: ['eventId'],
          message: 'forced validation failure',
        },
      ]),
    } as ReturnType<typeof ConstituentEventSchema.safeParse>)

    expect(() =>
      mapCventToMaster({
        AttendeeStub: 'attendee-12345',
        EmailAddress: 'jane.doe@university.edu',
        EventCode: 'REG-2026-GALA',
      }),
    ).toThrow(ZodError)

    spy.mockRestore()
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
    expect(result.normalizedMetadata).toEqual({ donation_type: 'donation' })
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

  it('handles European-formatted numeric strings', () => {
    const rawPayload = {
      id: 'gc-eu-1',
      donation_type: 'donation',
      value: '1.000,50',
      currency: 'EUR',
      donor_email: 'alumni@school.edu',
    }

    const result = mapGiveCampusToMaster(rawPayload)

    expect(result.amount).toBe(1000.5)
  })

  it('handles currency-prefixed numeric strings', () => {
    const result = mapGiveCampusToMaster({
      id: 'gc-currency-1',
      donation_type: 'donation',
      value: '$1,000.50',
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    })

    expect(result.amount).toBe(1000.5)
  })

  it('produces the same eventId when the same GiveCampus payload is retried', () => {
    const rawPayload = {
      id: 'gc-999',
      donation_type: 'donation',
      value: 500.0,
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    }

    const first = mapGiveCampusToMaster(rawPayload)
    const second = mapGiveCampusToMaster(rawPayload)

    expect(first.eventId).toBe(second.eventId)
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

  it('throws a ZodError when donor_email is malformed', () => {
    const invalidPayload = {
      id: 'gc-1003',
      donation_type: 'donation',
      value: 250,
      currency: 'USD',
      donor_email: 'not-an-email',
    }

    expect(() => mapGiveCampusToMaster(invalidPayload)).toThrow(ZodError)

    try {
      mapGiveCampusToMaster(invalidPayload)
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError)

      if (error instanceof ZodError) {
        const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>
        expect(fieldErrors.donor_email).toBeDefined()
      }
    }
  })

  it('throws a ZodError when required GiveCampus fields are missing', () => {
    const invalidPayload = {
      id: 'gc-1004',
      donation_type: 'donation',
      currency: 'USD',
    }

    expect(() => mapGiveCampusToMaster(invalidPayload)).toThrow(ZodError)
  })

  it('accepts zero as a valid numeric donation value', () => {
    const result = mapGiveCampusToMaster({
      id: 'gc-1005',
      donation_type: 'donation',
      value: 0,
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    })

    expect(result.amount).toBe(0)
  })

  it('throws a ZodError when the payload is not a JSON object', () => {
    expect(() => mapGiveCampusToMaster(undefined)).toThrow(ZodError)
    expect(() => mapGiveCampusToMaster(null)).toThrow(ZodError)
  })

  it('throws a ZodError when master schema validation fails unexpectedly', () => {
    const spy = vi.spyOn(ConstituentEventSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new ZodError([
        {
          code: 'custom',
          path: ['amount'],
          message: 'forced validation failure',
        },
      ]),
    } as ReturnType<typeof ConstituentEventSchema.safeParse>)

    expect(() =>
      mapGiveCampusToMaster({
        id: 'gc-1006',
        donation_type: 'donation',
        value: 100,
        currency: 'USD',
        donor_email: 'alumni@school.edu',
      }),
    ).toThrow(ZodError)

    spy.mockRestore()
  })
})

describe('mapImodulesToMaster', () => {
  it('maps a valid iModules payload to the master schema', () => {
    const result = mapImodulesToMaster(validImodulesPayload)

    expect(result.constituentEmail).toBe(validImodulesPayload.email)
    expect(result.eventType).toBe('EVENT_REGISTRATION')
    expect(result.sourceSystem).toBe('IMODULES')
  })

  it('throws when registration_id is missing', () => {
    expect(() => mapImodulesToMaster({ email: 'a@b.edu', event_name: 'Gala' })).toThrow(ZodError)
  })
})

describe('mapBlackbaudToMaster', () => {
  it('maps a valid Blackbaud payload to the master schema', () => {
    const result = mapBlackbaudToMaster(validBlackbaudPayload)

    expect(result.constituentEmail).toBe(validBlackbaudPayload.constituent_email)
    expect(result.amount).toBe(1000)
    expect(result.sourceSystem).toBe('BLACKBAUD')
  })

  it('coerces locale-formatted gift amounts', () => {
    const result = mapBlackbaudToMaster({ ...validBlackbaudPayload, gift_amount: '1,000.50' })

    expect(result.amount).toBe(1000.5)
  })

  it('throws when gift_amount is not numeric', () => {
    expect(() =>
      mapBlackbaudToMaster({ ...validBlackbaudPayload, gift_amount: 'not-a-number' }),
    ).toThrow(ZodError)
  })
})

describe('mapNpspToMaster', () => {
  it('maps a valid NPSP payload to the master schema', () => {
    const result = mapNpspToMaster(validNpspPayload)

    expect(result.constituentEmail).toBe(validNpspPayload.npe01__HomeEmail__c)
    expect(result.amount).toBe(500)
    expect(result.sourceSystem).toBe('NPSP')
  })

  it('coerces locale-formatted numeric strings', () => {
    const result = mapNpspToMaster({ ...validNpspPayload, Amount: '1,250.00' })

    expect(result.amount).toBe(1250)
  })

  it('throws when email field is invalid', () => {
    expect(() =>
      mapNpspToMaster({ ...validNpspPayload, npe01__HomeEmail__c: 'not-an-email' }),
    ).toThrow(ZodError)
  })

  it('throws when amount is not numeric', () => {
    expect(() => mapNpspToMaster({ ...validNpspPayload, Amount: 'not-a-number' })).toThrow(
      ZodError,
    )
  })
})

describe('mapSlateToMaster', () => {
  it('maps a valid Slate payload to the master schema', () => {
    const result = mapSlateToMaster(validSlatePayload)

    expect(result.constituentEmail).toBe(validSlatePayload.email)
    expect(result.eventType).toBe('EVENT_REGISTRATION')
    expect(result.sourceSystem).toBe('SLATE')
    expect(result.normalizedMetadata?.form).toBe('event_registration')
  })

  it('infers DONATION event type from form name', () => {
    const result = mapSlateToMaster({ ...validSlatePayload, form: 'online_donation' })

    expect(result.eventType).toBe('DONATION')
  })

  it('infers EMAIL_CLICK event type from form name', () => {
    const result = mapSlateToMaster({ ...validSlatePayload, form: 'email_click_tracking' })

    expect(result.eventType).toBe('EMAIL_CLICK')
  })

  it('omits event_title metadata when not provided', () => {
    const { event_title: _, ...payload } = validSlatePayload
    const result = mapSlateToMaster(payload)

    expect(result.normalizedMetadata?.form).toBe('event_registration')
    expect(result.normalizedMetadata?.event_title).toBeUndefined()
  })

  it('throws when email is invalid', () => {
    expect(() => mapSlateToMaster({ ...validSlatePayload, email: 'not-an-email' })).toThrow(ZodError)
  })
})
