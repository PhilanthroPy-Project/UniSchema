import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'

const GiveCampusValueSchema = z.union([
  z.number(),
  z.string().transform((value, ctx) => {
    const parsed = Number.parseFloat(value)

    if (Number.isNaN(parsed)) {
      ctx.addIssue({
        code: 'custom',
        message: 'value must be a number or a string parseable to a float',
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

function toPayloadRecord(rawPayload: unknown): Record<string, unknown> {
  if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
    throw new Error('GiveCampus payload must be a JSON object')
  }

  return rawPayload as Record<string, unknown>
}

export function mapGiveCampusToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = GiveCampusPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const giveCampus = parsed.data

  const masterCandidate = {
    eventId: randomUUID(),
    constituentEmail: giveCampus.donor_email,
    eventType: 'DONATION' as const,
    sourceSystem: 'GIVECAMPUS',
    amount: giveCampus.value,
    currency: giveCampus.currency,
    payload: toPayloadRecord(rawPayload),
    createdAt: new Date().toISOString(),
  }

  const validated = ConstituentEventSchema.safeParse(masterCandidate)

  if (!validated.success) {
    throw new z.ZodError(validated.error.issues)
  }

  return validated.data
}
