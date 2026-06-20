import { beforeEach } from 'vitest'

import { initDatabase, resetDatabase } from '../src/db/client.js'

process.env.DATABASE_URL = ':memory:'
process.env.EGRESS_TARGET = 'local'
process.env.EGRESS_LOCAL_DIR = 'data/test-egress'
initDatabase()

beforeEach(() => {
  resetDatabase()
})
