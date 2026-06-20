import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'
import { parseLocaleNumber } from '../utils/parseLocaleNumber.js'

const NpspAmountSchema = z.union([
  z.number(),
  z.string().transform((value, ctx) => {
    const parsed = parseLocaleNumber(value)
    if (parsed === null) {
      ctx.addIssue({ code: 'custom', message: 'Amount must be numeric' })
      return z.NEVER
    }
    return parsed
  }),
])

export const NpspPayloadSchema = z.object({
  Id: z.string().min(1),
  npe01__HomeEmail__c: z.string().email(),
  FirstName: z.string().optional(),
  LastName: z.string().optional(),
  Amount: NpspAmountSchema,
  CurrencyIsoCode: z.string().min(1),
  RecordType: z.string().min(1),
})

export type NpspPayload = z.infer<typeof NpspPayloadSchema>

export function mapNpspToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = NpspPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const row = parsed.data

  const masterCandidate = {
    eventId: deterministicEventId('NPSP', row.Id),
    constituentEmail: row.npe01__HomeEmail__c,
    firstName: row.FirstName,
    lastName: row.LastName,
    eventType: 'DONATION' as const,
    sourceSystem: 'NPSP' as const,
    amount: row.Amount,
    currency: row.CurrencyIsoCode,
    normalizedMetadata: { record_type: row.RecordType },
    payload: toPrimitiveRecord(rawPayload),
    createdAt: new Date().toISOString(),
  }

  const validated = ConstituentEventSchema.safeParse(masterCandidate)

  if (!validated.success) {
    throw new z.ZodError(validated.error.issues)
  }

  return validated.data
}
