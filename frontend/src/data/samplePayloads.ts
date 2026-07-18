export type VendorOption = {
  slug: string
  label: string
  samplePayload: Record<string, unknown>
}

export const GIVECAMPUS_SAMPLE_PAYLOAD: Record<string, unknown> = {
  id: 'gc-donation-8842',
  donation_type: 'one_time',
  value: 250,
  currency: 'USD',
  donor_email: 'patron@university.edu',
}

export const CVENT_SAMPLE_PAYLOAD: Record<string, unknown> = {
  AttendeeStub: 'attendee-12345',
  EmailAddress: 'jane.doe@university.edu',
  EventCode: 'REG-2026-GALA',
  FirstName: 'Jane',
  LastName: 'Doe',
  RegistrationStatus: 'Confirmed',
}

export const IMODULES_SAMPLE_PAYLOAD: Record<string, unknown> = {
  registration_id: 'imod-2026-001',
  email: 'student@university.edu',
  event_name: 'Homecoming 2026',
}

export const BLACKBAUD_SAMPLE_PAYLOAD: Record<string, unknown> = {
  id: 'bb-gift-4421',
  constituent_email: 'donor@university.edu',
  gift_amount: 1000,
  currency: 'USD',
  first_name: 'Alex',
  last_name: 'Rivera',
  gift_type: 'Donation',
}

export const NPSP_SAMPLE_PAYLOAD: Record<string, unknown> = {
  Id: 'a0X5g000001AbCdEFG',
  npe01__HomeEmail__c: 'alumni@university.edu',
  FirstName: 'Sam',
  LastName: 'Chen',
  Amount: 500,
  CurrencyIsoCode: 'USD',
  RecordType: 'Donation',
}

export const GIVECAMPUS_VENDOR = 'GiveCampus'
export const CVENT_VENDOR = 'Cvent'
export const IMODULES_VENDOR = 'iModules'
export const BLACKBAUD_VENDOR = 'Blackbaud'
export const NPSP_VENDOR = 'NPSP'

export const SLATE_SAMPLE_PAYLOAD: Record<string, unknown> = {
  id: 'slate-reg-2026-001',
  email: 'prospect@university.edu',
  first: 'Jordan',
  last: 'Lee',
  form: 'event_registration',
  event_title: 'Open House 2026',
}

export const SLATE_VENDOR = 'Slate'
export const ELLUCIAN_VENDOR = 'Ellucian'
export const CIVICRM_VENDOR = 'CiviCRM'

export const ELLUCIAN_SAMPLE_PAYLOAD: Record<string, unknown> = {
  id: 'ellucian-evt-001',
  email: 'student@university.edu',
  first_name: 'Taylor',
  last_name: 'Nguyen',
  event_type: 'registration',
  person_id: 'P-12345',
}

export const CIVICRM_SAMPLE_PAYLOAD: Record<string, unknown> = {
  id: 'civicrm-contrib-5501',
  contact_id: 'civi-contact-8842',
  email: 'donor@nonprofit.org',
  first_name: 'Morgan',
  last_name: 'Ellis',
  entity: 'contribution',
  total_amount: 250,
  currency: 'USD',
}

export const VENDOR_OPTIONS: VendorOption[] = [
  { slug: 'givecampus', label: GIVECAMPUS_VENDOR, samplePayload: GIVECAMPUS_SAMPLE_PAYLOAD },
  { slug: 'cvent', label: CVENT_VENDOR, samplePayload: CVENT_SAMPLE_PAYLOAD },
  { slug: 'imodules', label: IMODULES_VENDOR, samplePayload: IMODULES_SAMPLE_PAYLOAD },
  { slug: 'blackbaud', label: BLACKBAUD_VENDOR, samplePayload: BLACKBAUD_SAMPLE_PAYLOAD },
  { slug: 'npsp', label: NPSP_VENDOR, samplePayload: NPSP_SAMPLE_PAYLOAD },
  { slug: 'slate', label: SLATE_VENDOR, samplePayload: SLATE_SAMPLE_PAYLOAD },
  { slug: 'ellucian', label: ELLUCIAN_VENDOR, samplePayload: ELLUCIAN_SAMPLE_PAYLOAD },
  { slug: 'civicrm', label: CIVICRM_VENDOR, samplePayload: CIVICRM_SAMPLE_PAYLOAD },
]

export function getVendorOption(slug: string): VendorOption | undefined {
  return VENDOR_OPTIONS.find((option) => option.slug === slug.toLowerCase())
}

export function getVendorLabel(slug: string): string {
  return getVendorOption(slug)?.label ?? slug
}
