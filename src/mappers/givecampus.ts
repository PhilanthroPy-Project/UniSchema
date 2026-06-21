import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'
import { parseLocaleNumber } from '../utils/parseLocaleNumber.js'

const GiveCampusValueSchema = z.union([
  z.number(),
  z.string().transform((value, ctx) => {
    const parsed = parseLocaleNumber(value)

    if (parsed === null) {
      ctx.addIssue({
        code: 'custom',
        message:
          'value must be a number or a locale-formatted numeric string (e.g. 1000.50, 1,000.50, 1.000,50)',
      })
      return z.NEVER
    }

    return parsed
  }),
])

export const GiveCampusPayloadSchema = z.object({
  id: z.string().min(1),
  donation_type: z.string().min(1),
  value: GiveCampusValueSchema,
  currency: z.string().min(1),
  donor_email: z.string().email(),
})

export type GiveCampusPayload = z.infer<typeof GiveCampusPayloadSchema>

export function mapGiveCampusToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = GiveCampusPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const giveCampus = parsed.data

  const masterCandidate = {
    eventId: deterministicEventId('GIVECAMPUS', giveCampus.id),
    constituentEmail: giveCampus.donor_email,
    externalConstituentId: giveCampus.id,
    eventType: 'DONATION' as const,
    sourceSystem: 'GIVECAMPUS',
    amount: giveCampus.value,
    currency: giveCampus.currency,
    normalizedMetadata: {
      donation_type: giveCampus.donation_type,
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
