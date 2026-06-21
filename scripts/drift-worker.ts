#!/usr/bin/env tsx
/**
 * Drift worker — polls pending drift events, writes redacted fixtures + Vitest tests.
 *
 * Usage:
 *   tsx scripts/drift-worker.ts --api-url http://localhost:3000 --token "$DRIFT_AGENT_TOKEN"
 *   tsx scripts/drift-worker.ts --dry-run --limit 1
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildDriftBasename,
  buildDriftFixtureRelativePath,
  buildDriftTestRelativePath,
  buildDriftTestSource,
  formatDriftTimestamp,
  type DriftVendor,
} from '../src/utils/driftCapture.js'
import { redactPayload } from '../src/utils/piiRedaction.js'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

type DriftEvent = {
  id: string
  vendor: DriftVendor
  capturedAt: string
  validationErrors: unknown
  mapperKind: 'builtin' | 'dynamic'
  rawPayload?: unknown
  mappingArtifact?: unknown
}

type WorkerOptions = {
  apiUrl?: string
  token?: string
  limit: number
  dryRun: boolean
  ack: boolean
}

function parseArgs(argv: string[]): WorkerOptions {
  const options: WorkerOptions = {
    limit: 5,
    dryRun: false,
    ack: true,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--api-url') {
      options.apiUrl = argv[index + 1]
      index += 1
    } else if (arg === '--token') {
      options.token = argv[index + 1]
      index += 1
    } else if (arg === '--limit') {
      options.limit = Number.parseInt(argv[index + 1] ?? '5', 10)
      index += 1
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--no-ack') {
      options.ack = false
    }
  }

  return options
}

async function fetchPendingEvents(options: WorkerOptions): Promise<DriftEvent[]> {
  if (options.dryRun) {
    const seedPath = path.join(rootDir, 'tests/__fixtures__/drift/seed/givecampus-drift.json')
    const { readFile } = await import('node:fs/promises')
    const payload = JSON.parse(await readFile(seedPath, 'utf8')) as unknown

    return [
      {
        id: 'seed-drift-event',
        vendor: 'givecampus',
        capturedAt: new Date().toISOString(),
        validationErrors: { fieldErrors: { value: ['invalid'] } },
        mapperKind: 'builtin',
        rawPayload: payload,
      },
    ]
  }

  if (!options.apiUrl || !options.token) {
    throw new Error('Provide --api-url and --token, or use --dry-run with seed fixture')
  }

  const url = `${options.apiUrl.replace(/\/$/, '')}/api/drift/events?status=pending&includePayload=true&limit=${options.limit}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${options.token}` },
  })

  if (!response.ok) {
    throw new Error(`Drift API failed (${response.status})`)
  }

  const body = (await response.json()) as { events: DriftEvent[] }
  return body.events
}

async function ackEvent(options: WorkerOptions, eventId: string): Promise<void> {
  if (!options.ack || options.dryRun || !options.apiUrl || !options.token) {
    return
  }

  const response = await fetch(
    `${options.apiUrl.replace(/\/$/, '')}/api/drift/events/${eventId}/ack`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${options.token}` },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to ack drift event ${eventId} (${response.status})`)
  }
}

async function writeArtifacts(event: DriftEvent): Promise<{ fixturePath: string; testPath: string }> {
  const timestamp = formatDriftTimestamp(new Date(event.capturedAt))
  const basename = buildDriftBasename(event.vendor, timestamp)
  const fixtureRel = buildDriftFixtureRelativePath(basename)
  const testRel = buildDriftTestRelativePath(basename)
  const fixtureAbs = path.join(rootDir, fixtureRel)
  const testAbs = path.join(rootDir, testRel)

  await mkdir(path.dirname(fixtureAbs), { recursive: true })
  await mkdir(path.dirname(testAbs), { recursive: true })

  const redacted = redactPayload(event.rawPayload)
  await writeFile(fixtureAbs, `${JSON.stringify(redacted, null, 2)}\n`, 'utf8')

  const issueCount =
    typeof event.validationErrors === 'object' &&
    event.validationErrors !== null &&
    'fieldErrors' in (event.validationErrors as Record<string, unknown>)
      ? Object.keys((event.validationErrors as { fieldErrors: Record<string, unknown> }).fieldErrors)
          .length
      : 1

  const testSource = buildDriftTestSource(event.vendor, basename, event.capturedAt, issueCount, {
    mapperKind: event.mapperKind,
    mappingArtifact: event.mappingArtifact as never,
  })

  await writeFile(testAbs, testSource, 'utf8')

  return { fixturePath: fixtureRel, testPath: testRel }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const events = await fetchPendingEvents(options)

  if (events.length === 0) {
    console.log('No pending drift events.')
    return
  }

  for (const event of events) {
    if (!event.rawPayload) {
      console.warn(`Skipping ${event.id} — no payload`)
      continue
    }

    const paths = await writeArtifacts(event)
    console.log(`Wrote ${paths.fixturePath} and ${paths.testPath}`)

    if (!options.dryRun) {
      await ackEvent(options, event.id)
      console.log(`Acked drift event ${event.id}`)
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
