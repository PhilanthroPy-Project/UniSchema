import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'

export const SlatePayloadSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  first: z.string().optional(),
  last: z.string().optional(),
  form: z.string().min(1),
  event_title: z.string().optional(),
})

export type SlatePayload = z.infer<typeof SlatePayloadSchema>

function inferEventType(form: string): ConstituentEvent['eventType'] {
  const normalized = form.toLowerCase()

  if (normalized.includes('donat') || normalized.includes('gift')) {
    return 'DONATION'
  }

  if (normalized.includes('email') || normalized.includes('click')) {
    return 'EMAIL_CLICK'
  }

  return 'EVENT_REGISTRATION'
}

export function mapSlateToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = SlatePayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const row = parsed.data

  const masterCandidate = {
    eventId: deterministicEventId('SLATE', row.id),
    constituentEmail: row.email,
    firstName: row.first,
    lastName: row.last,
    eventType: inferEventType(row.form),
    sourceSystem: 'SLATE' as const,
    normalizedMetadata: {
      form: row.form,
      ...(row.event_title ? { event_title: row.event_title } : {}),
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
