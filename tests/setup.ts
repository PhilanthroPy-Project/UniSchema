import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach } from 'vitest'

import { initDatabase, resetDatabase } from '../src/db/client.js'

process.env.DATABASE_URL = ':memory:'
process.env.EGRESS_TARGET = 'local'
initDatabase()

let currentEgressDir: string | undefined

beforeEach(async () => {
  await resetDatabase()
  currentEgressDir = path.join(tmpdir(), 'unischema-test-egress', randomUUID())
  process.env.EGRESS_LOCAL_DIR = currentEgressDir
})

afterEach(async () => {
  if (!currentEgressDir) {
    return
  }

  await rm(currentEgressDir, { recursive: true, force: true }).catch(() => undefined)
  currentEgressDir = undefined
})
