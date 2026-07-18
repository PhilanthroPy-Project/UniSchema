import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'
import { parseLocaleNumber } from '../utils/parseLocaleNumber.js'

export const CivicrmPayloadSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  entity: z.enum(['contribution', 'participant', 'mailing']).optional(),
  total_amount: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
  contact_id: z.string().optional(),
})

export type CivicrmPayload = z.infer<typeof CivicrmPayloadSchema>

function mapEventType(value: CivicrmPayload['entity']): ConstituentEvent['eventType'] {
  switch (value) {
    case 'contribution':
      return 'DONATION'
    case 'mailing':
      return 'EMAIL_CLICK'
    default:
      return 'EVENT_REGISTRATION'
  }
}

export function mapCivicrmToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = CivicrmPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const row = parsed.data
  let amount: number | undefined

  if (typeof row.total_amount === 'number') {
    amount = row.total_amount
  } else if (typeof row.total_amount === 'string') {
    amount = parseLocaleNumber(row.total_amount) ?? undefined
  }

  const masterCandidate = {
    eventId: deterministicEventId('CIVICRM', row.id),
    constituentEmail: row.email,
    externalConstituentId: row.contact_id,
    firstName: row.first_name,
    lastName: row.last_name,
    eventType: mapEventType(row.entity),
    sourceSystem: 'CIVICRM' as const,
    amount,
    currency: row.currency,
    normalizedMetadata: {
      civicrm_entity: row.entity ?? 'participant',
    },
    payload: toPrimitiveRecord(rawPayload),
    createdAt: new Date().toISOString(),
  }

  const validated = ConstituentEventSchema.safeParse(masterCandidate)

  if (!validated.success) {
    throw new z.ZodError(validated.error.issues)
  }

  return validated.data
}
