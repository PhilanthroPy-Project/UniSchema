import { z } from 'zod'

import { ConstituentEventSchema } from './master.js'

/**
 * Machine-readable ConstituentEvent contract, derived from the Zod schema so it
 * cannot drift from `master.ts`. Published as `schema/constituent-event.schema.json`
 * so downstream consumers (PhilanthroPy `philanthropy.ingest`, salesforce-npsp,
 * warehouses) validate against a versioned artifact instead of hand-copied field
 * names. Regenerate with `npm run schema:export`; a drift test fails CI otherwise.
 */
export function buildConstituentEventJsonSchema(): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(ConstituentEventSchema) as Record<string, unknown>

  return {
    $id: 'https://raw.githubusercontent.com/PhilanthroPy-Project/UniSchema/main/schema/constituent-event.schema.json',
    title: 'ConstituentEvent',
    description:
      'Canonical UniSchema output event, consumed by PhilanthroPy `philanthropy.ingest` and warehouse pipelines. Regenerate via `npm run schema:export`.',
    ...jsonSchema,
  }
}

/** Exact contents of `schema/constituent-event.schema.json` (trailing newline included). */
export function serializeConstituentEventJsonSchema(): string {
  return `${JSON.stringify(buildConstituentEventJsonSchema(), null, 2)}\n`
}
