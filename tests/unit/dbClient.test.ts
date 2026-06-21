import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { closeDatabase, initDatabase } from '../../src/db/client.js'

describe('database client', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL

  afterEach(() => {
    closeDatabase()

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }

    process.env.DATABASE_URL = ':memory:'
    initDatabase()
  })

  it('supports file: DATABASE_URL prefixes', () => {
    closeDatabase()
    process.env.DATABASE_URL = 'file::memory:?cache=shared'

    expect(() => initDatabase()).not.toThrow()
  })

  it('normalizes :memory:?cache=shared to an in-memory database (no disk file)', () => {
    closeDatabase()
    process.env.DATABASE_URL = ':memory:?cache=shared'

    expect(() => initDatabase()).not.toThrow()
  })

  it('creates parent directories for file-backed SQLite paths', () => {
    closeDatabase()
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'unischema-db-'))
    const dbPath = path.join(tempRoot, 'nested', 'unischema.db')

    try {
      process.env.DATABASE_URL = dbPath
      expect(() => initDatabase()).not.toThrow()
    } finally {
      closeDatabase()
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})
