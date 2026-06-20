import { z } from 'zod'

import {
  ConstituentEventSchema,
  EventTypeSchema,
  type ConstituentEvent,
} from '../schema/master.js'
import { coerceToPrimitive, toPrimitiveRecord } from '../schema/primitives.js'
import type { MappingArtifact, MappableTargetField } from '../schema/mapping.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'
import { parseLocaleNumber } from '../utils/parseLocaleNumber.js'
import { resolveSourceSystem } from '../utils/sourceSystem.js'

export function getValueAtPath(payload: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.').filter(Boolean)

  let current: unknown = payload

  for (const segment of segments) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

function resolveVendorId(payload: Record<string, unknown>, vendor: string): string {
  const candidates = ['id', 'AttendeeStub', 'attendee_stub', 'donation_id']

  for (const key of candidates) {
    const value = payload[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  return `${vendor}-${JSON.stringify(payload).slice(0, 64)}`
}

function coerceTargetValue(target: MappableTargetField, value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined
  }

  switch (target) {
    case 'amount': {
      if (typeof value === 'number') {
        return value
      }

      if (typeof value === 'string') {
        const parsed = parseLocaleNumber(value)
        if (parsed === null) {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['amount'],
              message: 'Amount must be a number or locale-formatted numeric string',
            },
          ])
        }

        return parsed
      }

      throw new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          path: ['amount'],
          message: 'Invalid input: expected number',
        },
      ])
    }
    case 'eventType': {
      const parsed = EventTypeSchema.safeParse(value)
      if (!parsed.success) {
        throw new z.ZodError(parsed.error.issues)
      }

      return parsed.data
    }
    case 'constituentEmail':
    case 'firstName':
    case 'lastName':
    case 'currency':
      return String(value)
    default:
      return value
  }
}

const DEFAULT_EVENT_TYPES: Record<string, ConstituentEvent['eventType']> = {
  cvent: 'EVENT_REGISTRATION',
  givecampus: 'DONATION',
}

/**
 * Applies an admin-defined mapping artifact to a raw vendor payload.
 */
export function mapWithArtifact(
  rawPayload: unknown,
  artifact: MappingArtifact,
): ConstituentEvent {
  if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
    throw new Error('Webhook payload must be a JSON object')
  }

  const rawRecord = rawPayload as Record<string, unknown>
  const payload = toPrimitiveRecord(rawPayload)
  const vendorKey = artifact.vendor.trim().toLowerCase()
  const sourceSystem = resolveSourceSystem(vendorKey)
  const normalizedMetadata: Record<string, string | number | boolean | null> = {}

  const candidate: Record<string, unknown> = {
    eventId: deterministicEventId(sourceSystem, resolveVendorId(rawRecord, vendorKey)),
    sourceSystem,
    payload,
    normalizedMetadata,
    createdAt: new Date().toISOString(),
  }

  for (const mapping of artifact.mappings) {
    const rawValue = getValueAtPath(rawRecord, mapping.source)
    candidate[mapping.target] = coerceTargetValue(mapping.target, rawValue)
  }

  for (const metadataMapping of artifact.metadataMappings ?? []) {
    normalizedMetadata[metadataMapping.key] = coerceToPrimitive(
      getValueAtPath(rawRecord, metadataMapping.source),
    )
  }

  if (candidate.eventType === undefined) {
    candidate.eventType = DEFAULT_EVENT_TYPES[vendorKey] ?? 'EVENT_REGISTRATION'
  }

  const validated = ConstituentEventSchema.safeParse(candidate)

  if (!validated.success) {
    throw new z.ZodError(validated.error.issues)
  }

  return validated.data
}
