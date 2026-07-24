import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { serializeConstituentEventJsonSchema } from '../../src/schema/jsonSchema.js'
import {
  ConstituentEventSchema,
  EventTypeSchema,
  SourceSystemSchema,
} from '../../src/schema/master.js'

const schemaFilePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../schema/constituent-event.schema.json',
)

// Fields PhilanthroPy's `philanthropy.ingest` reads off each ConstituentEvent
// (see PhilanthroPy philanthropy/ingest/_constituent_events.py). Renaming or
// dropping any of these silently breaks the downstream feature aggregation, so
// pin them here — a schema change that touches them must consciously update this.
const PHILANTHROPY_INGEST_FIELDS = [
  'eventId',
  'constituentEmail',
  'externalConstituentId',
  'eventType',
  'sourceSystem',
  'amount',
  'currency',
  'createdAt',
] as const

describe('ConstituentEvent JSON Schema contract', () => {
  it('keeps the checked-in schema/constituent-event.schema.json in sync with master.ts', () => {
    const onDisk = readFileSync(schemaFilePath, 'utf8')
    expect(
      onDisk,
      'schema/constituent-event.schema.json is stale — run `npm run schema:export`',
    ).toBe(serializeConstituentEventJsonSchema())
  })

  it('retains every field the PhilanthroPy ingest depends on', () => {
    const shape = ConstituentEventSchema.shape
    for (const field of PHILANTHROPY_INGEST_FIELDS) {
      expect(shape, `ConstituentEvent no longer exposes "${field}"`).toHaveProperty(field)
    }
  })

  it('pins the event-type and source-system enums downstream consumers switch on', () => {
    expect(EventTypeSchema.options).toEqual(['EVENT_REGISTRATION', 'DONATION', 'EMAIL_CLICK'])
    expect(SourceSystemSchema.options).toEqual([
      'CVENT',
      'GIVECAMPUS',
      'IMODULES',
      'BLACKBAUD',
      'NPSP',
      'SLATE',
      'ELLUCIAN',
      'CIVICRM',
    ])
  })
})
