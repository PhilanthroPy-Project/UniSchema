const STORAGE_KEY = 'unischema.mappingSyncToken'

/** Build-time token for trusted internal deployments (see docs/admin-guide.md). */
export function getBuildTimeSyncToken(): string | undefined {
  const token = import.meta.env.VITE_MAPPING_SYNC_TOKEN
  return typeof token === 'string' && token.trim().length > 0 ? token.trim() : undefined
}

export function getStoredSyncToken(): string | undefined {
  const buildTime = getBuildTimeSyncToken()
  if (buildTime) {
    return buildTime
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored && stored.trim().length > 0 ? stored.trim() : undefined
  } catch {
    return undefined
  }
}

export function setStoredSyncToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token.trim())
}

export function clearStoredSyncToken(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function hasSyncTokenConfigured(): boolean {
  return getStoredSyncToken() !== undefined
}

export function buildAuthHeaders(): Record<string, string> {
  const token = getStoredSyncToken()
  if (!token) {
    return {}
  }

  return { Authorization: `Bearer ${token}` }
}
