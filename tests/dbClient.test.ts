import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase, initDatabase } from '../src/db/client.js'

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
})
