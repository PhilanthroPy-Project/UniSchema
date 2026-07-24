#!/usr/bin/env tsx
/**
 * Export the ConstituentEvent contract as a versioned JSON Schema.
 *
 * Writes schema/constituent-event.schema.json so downstream consumers validate
 * against a published artifact instead of hand-copied field names. A drift test
 * (tests/unit/schemaContract.test.ts) fails CI if this file is stale.
 *
 * Usage:
 *   npm run schema:export
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { serializeConstituentEventJsonSchema } from '../src/schema/jsonSchema.js'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
export const schemaOutputPath = path.join(rootDir, 'schema', 'constituent-event.schema.json')

async function main(): Promise<void> {
  await writeFile(schemaOutputPath, serializeConstituentEventJsonSchema(), 'utf8')
  console.log(`Wrote ${path.relative(rootDir, schemaOutputPath)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
