import { z } from 'zod'

/** Flat tabular values safe for downstream ML feature pipelines. */
export const PrimitiveValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])

export type PrimitiveValue = z.infer<typeof PrimitiveValueSchema>

export const PrimitiveRecordSchema = z.record(z.string(), PrimitiveValueSchema)

export type PrimitiveRecord = z.infer<typeof PrimitiveRecordSchema>

/** Coerces vendor anomalies into flat primitive values (nested values become JSON strings). */
export function coerceToPrimitive(value: unknown): PrimitiveValue {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  return JSON.stringify(value)
}

export function toPrimitiveRecord(rawPayload: unknown): PrimitiveRecord {
  if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
    throw new Error('Payload must be a JSON object')
  }

  const result: PrimitiveRecord = {}

  for (const [key, value] of Object.entries(rawPayload as Record<string, unknown>)) {
    result[key] = coerceToPrimitive(value)
  }

  return result
}
