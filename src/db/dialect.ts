/** Returns true when DATABASE_URL points at Postgres. */
export function isPostgresDatabaseUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

export function getDatabaseDialect(): 'sqlite' | 'postgres' {
  return isPostgresDatabaseUrl(process.env.DATABASE_URL) ? 'postgres' : 'sqlite'
}
