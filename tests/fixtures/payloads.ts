import type { ConstituentEvent } from '../../src/schema/master.js'

export const validCventPayload = {
  AttendeeStub: 'attendee-12345',
  EmailAddress: 'jane.doe@university.edu',
  EventCode: 'REG-2026-GALA',
  FirstName: 'Jane',
  LastName: 'Doe',
  RegistrationStatus: 'Confirmed',
} as const

export const validGiveCampusPayload = {
  id: 'gc-999',
  donation_type: 'donation',
  value: 500.0,
  currency: 'USD',
  donor_email: 'alumni@school.edu',
} as const

export const validImodulesPayload = {
  registration_id: 'imod-2026-001',
  email: 'student@university.edu',
  event_name: 'Homecoming 2026',
} as const

export const validBlackbaudPayload = {
  id: 'bb-gift-4421',
  constituent_email: 'donor@university.edu',
  gift_amount: 1000,
  currency: 'USD',
  first_name: 'Alex',
  last_name: 'Rivera',
  gift_type: 'Donation',
} as const

export const validNpspPayload = {
  Id: 'a0X5g000001AbCdEFG',
  npe01__HomeEmail__c: 'alumni@university.edu',
  FirstName: 'Sam',
  LastName: 'Chen',
  Amount: 500,
  CurrencyIsoCode: 'USD',
  RecordType: 'Donation',
} as const

export const validConstituentEvent: ConstituentEvent = {
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  constituentEmail: 'alumni@school.edu',
  firstName: 'Jane',
  lastName: 'Doe',
  eventType: 'DONATION',
  sourceSystem: 'GIVECAMPUS',
  amount: 500,
  currency: 'USD',
  normalizedMetadata: {},
  payload: { id: 'gc-999' },
  createdAt: '2026-06-20T12:00:00.000Z',
}
