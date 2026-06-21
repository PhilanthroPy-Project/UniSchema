/**
 * Field metadata aligned with backend `ConstituentEventSchema` (src/schema/master.ts).
 * Keeps the mapping canvas in sync with Zod validation rules without bundling Zod in the UI.
 */
export type ConstituentEventFieldKey =
  | 'eventId'
  | 'constituentEmail'
  | 'firstName'
  | 'lastName'
  | 'eventType'
  | 'sourceSystem'
  | 'amount'
  | 'currency'
  | 'payload'
  | 'createdAt'

export type FieldRequirement = 'required' | 'optional' | 'system'

export type ConstituentEventFieldMeta = {
  key: ConstituentEventFieldKey
  label: string
  valueType: string
  requirement: FieldRequirement
  /** Whether admins can draw a mapping edge to this field on the canvas */
  mappable: boolean
  description: string
}

export const CONSTITUENT_EVENT_FIELDS: ConstituentEventFieldMeta[] = [
  {
    key: 'eventId',
    label: 'Event ID',
    valueType: 'uuid',
    requirement: 'system',
    mappable: false,
    description: 'Generated per ingestion',
  },
  {
    key: 'constituentEmail',
    label: 'Constituent Email',
    valueType: 'email',
    requirement: 'required',
    mappable: true,
    description: 'Primary constituent identifier',
  },
  {
    key: 'firstName',
    label: 'First Name',
    valueType: 'string',
    requirement: 'optional',
    mappable: true,
    description: 'Optional given name',
  },
  {
    key: 'lastName',
    label: 'Last Name',
    valueType: 'string',
    requirement: 'optional',
    mappable: true,
    description: 'Optional family name',
  },
  {
    key: 'eventType',
    label: 'Event Type',
    valueType: 'enum',
    requirement: 'required',
    mappable: true,
    description: 'EVENT_REGISTRATION | DONATION | EMAIL_CLICK',
  },
  {
    key: 'sourceSystem',
    label: 'Source System',
    valueType: 'enum',
    requirement: 'system',
    mappable: false,
    description: 'CVENT | GIVECAMPUS | IMODULES | BLACKBAUD | NPSP | SLATE',
  },
  {
    key: 'amount',
    label: 'Amount',
    valueType: 'number',
    requirement: 'optional',
    mappable: true,
    description: 'Monetary value when applicable',
  },
  {
    key: 'currency',
    label: 'Currency',
    valueType: 'string',
    requirement: 'optional',
    mappable: true,
    description: 'ISO currency code',
  },
  {
    key: 'payload',
    label: 'Raw Payload',
    valueType: 'object',
    requirement: 'system',
    mappable: false,
    description: 'Original vendor payload preserved',
  },
  {
    key: 'createdAt',
    label: 'Created At',
    valueType: 'datetime',
    requirement: 'system',
    mappable: false,
    description: 'Ingestion timestamp',
  },
]

export const MAPPABLE_TARGET_FIELDS = CONSTITUENT_EVENT_FIELDS.filter(
  (field) => field.mappable,
)

export const CONSTITUENT_EVENT_FIELD_KEYS = CONSTITUENT_EVENT_FIELDS.map(
  (field) => field.key,
)

export function getConstituentEventField(
  key: ConstituentEventFieldKey,
): ConstituentEventFieldMeta {
  const field = CONSTITUENT_EVENT_FIELDS.find((entry) => entry.key === key)
  if (!field) {
    throw new Error(`Unknown ConstituentEvent field: ${key}`)
  }
  return field
}
