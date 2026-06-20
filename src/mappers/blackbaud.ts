import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'
import { parseLocaleNumber } from '../utils/parseLocaleNumber.js'

const BlackbaudAmountSchema = z.union([
  z.number(),
  z.string().transform((value, ctx) => {
    const parsed = parseLocaleNumber(value)
    if (parsed === null) {
      ctx.addIssue({ code: 'custom', message: 'gift_amount must be numeric' })
      return z.NEVER
    }
    return parsed
  }),
])

export const BlackbaudPayloadSchema = z.object({
  id: z.string().min(1),
  constituent_email: z.string().email(),
  gift_amount: BlackbaudAmountSchema,
  currency: z.string().min(1),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  gift_type: z.string().min(1),
})

export type BlackbaudPayload = z.infer<typeof BlackbaudPayloadSchema>

export function mapBlackbaudToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = BlackbaudPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const row = parsed.data

  const masterCandidate = {
    eventId: deterministicEventId('BLACKBAUD', row.id),
    constituentEmail: row.constituent_email,
    firstName: row.first_name,
    lastName: row.last_name,
    eventType: 'DONATION' as const,
    sourceSystem: 'BLACKBAUD' as const,
    amount: row.gift_amount,
    currency: row.currency,
    normalizedMetadata: { gift_type: row.gift_type },
    payload: toPrimitiveRecord(rawPayload),
    createdAt: new Date().toISOString(),
  }

  const validated = ConstituentEventSchema.safeParse(masterCandidate)

  if (!validated.success) {
    throw new z.ZodError(validated.error.issues)
  }

  return validated.data
}
