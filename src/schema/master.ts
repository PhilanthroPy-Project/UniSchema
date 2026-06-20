import { z } from 'zod'

export const EventTypeSchema = z.enum([
  'EVENT_REGISTRATION',
  'DONATION',
  'EMAIL_CLICK',
])

export const ConstituentEventSchema = z.object({
  eventId: z.string().uuid(),
  constituentEmail: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  eventType: EventTypeSchema,
  sourceSystem: z.string(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
})

export type ConstituentEvent = z.infer<typeof ConstituentEventSchema>
