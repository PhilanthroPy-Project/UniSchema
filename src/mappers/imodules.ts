import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'
import { parseLocaleNumber } from '../utils/parseLocaleNumber.js'

export const ImodulesPayloadSchema = z.object({
  registration_id: z.string().min(1),
  email: z.string().email(),
  event_name: z.string().min(1),
})

export type ImodulesPayload = z.infer<typeof ImodulesPayloadSchema>

export function mapImodulesToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = ImodulesPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const row = parsed.data

  const masterCandidate = {
    eventId: deterministicEventId('IMODULES', row.registration_id),
    constituentEmail: row.email,
    eventType: 'EVENT_REGISTRATION' as const,
    sourceSystem: 'IMODULES' as const,
    normalizedMetadata: { event_name: row.event_name },
    payload: toPrimitiveRecord(rawPayload),
    createdAt: new Date().toISOString(),
  }

  const validated = ConstituentEventSchema.safeParse(masterCandidate)

  if (!validated.success) {
    throw new z.ZodError(validated.error.issues)
  }

  return validated.data
}
