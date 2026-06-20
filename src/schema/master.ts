import { z } from 'zod'

import { PrimitiveRecordSchema } from './primitives.js'

export const EventTypeSchema = z.enum([
  'EVENT_REGISTRATION',
  'DONATION',
  'EMAIL_CLICK',
])

export const NormalizedMetadataSchema = PrimitiveRecordSchema

export const ConstituentEventSchema = z.object({
  eventId: z.string().uuid(),
  constituentEmail: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  eventType: EventTypeSchema,
  sourceSystem: z.string(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  /** Vendor-specific fields mapped via the admin canvas for downstream ML pipelines. */
  normalizedMetadata: NormalizedMetadataSchema.default({}),
  payload: PrimitiveRecordSchema,
  createdAt: z.string().datetime(),
})

export type ConstituentEvent = z.infer<typeof ConstituentEventSchema>
