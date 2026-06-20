import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildAuthHeaders,
  clearStoredSyncToken,
  getStoredSyncToken,
  hasSyncTokenConfigured,
  setStoredSyncToken,
} from '../src/utils/syncToken'

function createSessionStorageMock(): Storage {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  }
}

describe('syncToken utilities', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorageMock())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns undefined when no token is stored', () => {
    expect(getStoredSyncToken()).toBeUndefined()
    expect(hasSyncTokenConfigured()).toBe(false)
    expect(buildAuthHeaders()).toEqual({})
  })

  it('persists and trims tokens in sessionStorage', () => {
    setStoredSyncToken('  pilot-token  ')

    expect(getStoredSyncToken()).toBe('pilot-token')
    expect(hasSyncTokenConfigured()).toBe(true)
    expect(buildAuthHeaders()).toEqual({ Authorization: 'Bearer pilot-token' })
  })

  it('clears stored tokens', () => {
    setStoredSyncToken('temporary-token')
    clearStoredSyncToken()

    expect(getStoredSyncToken()).toBeUndefined()
    expect(buildAuthHeaders()).toEqual({})
  })

  it('ignores empty stored values', () => {
    sessionStorage.setItem('unischema.mappingSyncToken', '   ')

    expect(getStoredSyncToken()).toBeUndefined()
  })
})
