import { randomUUID } from 'node:crypto'

import { beforeEach } from 'vitest'

import { initDatabase, resetDatabase } from '../src/db/client.js'

process.env.DATABASE_URL = ':memory:'
process.env.EGRESS_TARGET = 'local'
initDatabase()

beforeEach(async () => {
  await resetDatabase()
  process.env.EGRESS_LOCAL_DIR = `data/test-egress/${randomUUID()}`
})
