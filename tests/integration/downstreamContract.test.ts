import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import app from '../helpers/app.js'
import { validGiveCampusPayload } from '../fixtures/payloads.js'
import { waitForIngestion } from '../helpers/ingestion.js'

async function postJson(pathname: string, body: unknown) {
  return app.request(pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function countEgressJsonFiles(dir: string): Promise<number> {
  let count = 0

  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.name.endsWith('.json') && !entry.name.endsWith('.manifest.json')) {
        const content = await readFile(fullPath, 'utf8')
        const parsed = JSON.parse(content) as { eventId?: string; constituentEmail?: string }
        if (parsed.eventId && parsed.constituentEmail) {
          count += 1
        }
      }
    }
  }

  await walk(dir)
  return count
}

describe('downstream egress contract', () => {
  it('writes ConstituentEvent JSON to local egress after webhook ingest', async () => {
    const egressDir = process.env.EGRESS_LOCAL_DIR
    expect(egressDir).toBeTruthy()

    const response = await postJson('/webhooks/givecampus', validGiveCampusPayload)
    const body = (await response.json()) as { accepted: boolean; ingestionId: string }

    expect(response.status).toBe(202)
    expect(body.accepted).toBe(true)

    const ingestion = await waitForIngestion(body.ingestionId)
    expect(ingestion.status).toBe('completed')
    expect(ingestion.result?.constituentEmail).toBe(validGiveCampusPayload.donor_email)

    const fileCount = await countEgressJsonFiles(egressDir!)
    expect(fileCount).toBeGreaterThan(0)
  })
})
