import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'
import { parseLocaleNumber } from '../utils/parseLocaleNumber.js'

export const EllucianPayloadSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  event_type: z.enum(['registration', 'donation', 'email_click']).optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
  person_id: z.string().optional(),
})

export type EllucianPayload = z.infer<typeof EllucianPayloadSchema>

function mapEventType(value: EllucianPayload['event_type']): ConstituentEvent['eventType'] {
  switch (value) {
    case 'donation':
      return 'DONATION'
    case 'email_click':
      return 'EMAIL_CLICK'
    default:
      return 'EVENT_REGISTRATION'
  }
}

export function mapEllucianToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = EllucianPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const row = parsed.data
  let amount: number | undefined

  if (typeof row.amount === 'number') {
    amount = row.amount
  } else if (typeof row.amount === 'string') {
    amount = parseLocaleNumber(row.amount) ?? undefined
  }

  const masterCandidate = {
    eventId: deterministicEventId('ELLUCIAN', row.id),
    constituentEmail: row.email,
    externalConstituentId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    eventType: mapEventType(row.event_type),
    sourceSystem: 'ELLUCIAN' as const,
    amount,
    currency: row.currency,
    normalizedMetadata: {
      ellucian_event_type: row.event_type ?? 'registration',
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
