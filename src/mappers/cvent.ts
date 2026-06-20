import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import {
  ConstituentEventSchema,
  type ConstituentEvent,
} from '../schema/master.js'

export const CventPayloadSchema = z.object({
  AttendeeStub: z.string().min(1),
  EmailAddress: z.string().email(),
  EventCode: z.string().min(1),
  FirstName: z.string().optional(),
  LastName: z.string().optional(),
})

export type CventPayload = z.infer<typeof CventPayloadSchema>

const CVENT_EVENT_TYPE_MAP: Record<string, ConstituentEvent['eventType']> = {
  REG: 'EVENT_REGISTRATION',
  DONATION: 'DONATION',
  EMAIL: 'EMAIL_CLICK',
}

function resolveEventType(eventCode: string): ConstituentEvent['eventType'] {
  const normalizedCode = eventCode.toUpperCase()

  for (const [prefix, eventType] of Object.entries(CVENT_EVENT_TYPE_MAP)) {
    if (normalizedCode.startsWith(prefix)) {
      return eventType
    }
  }

  return 'EVENT_REGISTRATION'
}

function toPayloadRecord(rawPayload: unknown): Record<string, unknown> {
  if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
    throw new Error('Cvent payload must be a JSON object')
  }

  return rawPayload as Record<string, unknown>
}

export function mapCventToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = CventPayloadSchema.safeParse(rawPayload)

  if (!parsed.success) {
    throw new z.ZodError(parsed.error.issues)
  }

  const cvent = parsed.data

  const masterCandidate = {
    eventId: randomUUID(),
    constituentEmail: cvent.EmailAddress,
    firstName: cvent.FirstName,
    lastName: cvent.LastName,
    eventType: resolveEventType(cvent.EventCode),
    sourceSystem: 'CVENT',
    payload: toPayloadRecord(rawPayload),
    createdAt: new Date().toISOString(),
  }

  const validated = ConstituentEventSchema.safeParse(masterCandidate)

  if (!validated.success) {
    throw new z.ZodError(validated.error.issues)
  }

  return validated.data
}
