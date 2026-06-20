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

export const validConstituentEvent = {
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  constituentEmail: 'alumni@school.edu',
  firstName: 'Jane',
  lastName: 'Doe',
  eventType: 'DONATION' as const,
  sourceSystem: 'GIVECAMPUS',
  amount: 500,
  currency: 'USD',
  payload: { id: 'gc-999' },
  createdAt: '2026-06-20T12:00:00.000Z',
}
