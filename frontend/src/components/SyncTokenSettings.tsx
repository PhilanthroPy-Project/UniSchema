import { useCallback, useEffect, useState } from 'react'
import { KeyRound, X } from 'lucide-react'

import {
  clearStoredSyncToken,
  getBuildTimeSyncToken,
  getStoredSyncToken,
  setStoredSyncToken,
} from '../utils/syncToken'

type SyncTokenSettingsProps = {
  onTokenChange?: () => void
}

export function SyncTokenSettings({ onTokenChange }: SyncTokenSettingsProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [configured, setConfigured] = useState(false)
  const buildTimeToken = getBuildTimeSyncToken()

  const refresh = useCallback(() => {
    setConfigured(getStoredSyncToken() !== undefined)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSave = () => {
    if (draft.trim()) {
      setStoredSyncToken(draft)
      setDraft('')
      refresh()
      onTokenChange?.()
      setOpen(false)
    }
  }

  const handleClear = () => {
    clearStoredSyncToken()
    setDraft('')
    refresh()
    onTokenChange?.()
  }

  if (buildTimeToken) {
    return (
      <span className="rounded-full bg-theme-inset px-3 py-1.5 text-xs text-theme-muted">
        Sync token (build-time)
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-sm backdrop-blur-xl transition',
          configured
            ? 'bg-apple-green/10 text-apple-green'
            : 'bg-theme-surface text-theme-ink hover:bg-theme-elevated',
        ].join(' ')}
        title="Mapping sync token (required in production)"
      >
        <KeyRound className="h-4 w-4" />
        {configured ? 'Token set' : 'Set sync token'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-theme-ink">Mapping sync token</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-theme-muted hover:bg-theme-inset"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-theme-muted">
              Your operator sets <code className="text-xs">MAPPING_SYNC_TOKEN</code> in production.
              Paste it here to authorize Sync to Engine. Stored in session storage only.
            </p>
            <input
              type="password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Bearer token from operator"
              className="mb-4 w-full rounded-xl border border-theme-border bg-theme-inset px-4 py-2.5 text-sm text-theme-ink outline-none focus:ring-2 focus:ring-apple-blue-focus"
              autoComplete="off"
            />
            <div className="flex justify-end gap-2">
              {configured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full px-4 py-2 text-sm text-theme-muted hover:bg-theme-inset"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.trim()}
                className="rounded-full bg-apple-blue-focus px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Save token
              </button>
            </div>
            <p className="mt-4 text-xs text-theme-muted">
              Sync returns 401? Ask your operator — see{' '}
              <a
                href="https://github.com/PhilanthroPy-Project/UniSchema/blob/main/docs/admin-guide.md"
                target="_blank"
                rel="noreferrer"
                className="text-apple-blue underline"
              >
                admin guide
              </a>
              .
            </p>
          </div>
        </div>
      )}
    </>
  )
}
