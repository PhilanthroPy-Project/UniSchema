import { describe, expect, it } from 'vitest'

import { getDatabaseDialect, isPostgresDatabaseUrl } from '../../src/db/dialect.js'

describe('database dialect', () => {
  it('detects postgres URLs', () => {
    expect(isPostgresDatabaseUrl('postgres://user:pass@localhost/db')).toBe(true)
    expect(isPostgresDatabaseUrl('postgresql://user:pass@localhost/db')).toBe(true)
    expect(isPostgresDatabaseUrl('data/unischema.db')).toBe(false)
    expect(isPostgresDatabaseUrl(':memory:')).toBe(false)
  })

  it('defaults to sqlite when DATABASE_URL is unset', () => {
    const original = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    expect(getDatabaseDialect()).toBe('sqlite')

    process.env.DATABASE_URL = original
  })

  it('selects postgres when DATABASE_URL uses postgres scheme', () => {
    const original = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost/unischema'

    expect(getDatabaseDialect()).toBe('postgres')

    process.env.DATABASE_URL = original
  })
})
