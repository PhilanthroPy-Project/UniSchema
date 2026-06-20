import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react'

import { ackDriftEvent, fetchDriftEvents, type DriftEventSummary } from '../api/driftEvents'
import { SyncTokenSettings } from './SyncTokenSettings'
import { ThemeToggle } from './ThemeToggle'

type DriftQueuePanelProps = {
  onNavigateMapping?: (vendorSlug: string) => void
}

export function DriftQueuePanel({ onNavigateMapping }: DriftQueuePanelProps) {
  const [events, setEvents] = useState<DriftEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'processed'>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [includePayload, setIncludePayload] = useState(true)
  const [ackingId, setAckingId] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchDriftEvents(statusFilter, undefined, includePayload)
      setEvents(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load drift events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [includePayload, statusFilter])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const handleCopyFixture = async (event: DriftEventSummary) => {
    if (!event.rawPayload) {
      return
    }

    const fixture = JSON.stringify(event.rawPayload, null, 2)
    await navigator.clipboard.writeText(fixture)
  }

  const handleAck = async (id: string) => {
    setAckingId(id)
    try {
      await ackDriftEvent(id)
      await loadEvents()
    } catch (ackError) {
      setError(ackError instanceof Error ? ackError.message : 'Failed to ack event')
    } finally {
      setAckingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col bg-theme-bg font-system text-theme-ink">
      <header className="flex shrink-0 items-center justify-between gap-4 bg-theme-surface px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Drift Queue</h1>
            <p className="text-sm text-theme-muted">
              Schema validation failures — review payloads and open the mapping canvas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-theme-muted">
            <input
              type="checkbox"
              checked={includePayload}
              onChange={(event) => setIncludePayload(event.target.checked)}
            />
            Include payloads
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'pending' | 'processed')
            }
            className="rounded-full border border-theme-border bg-theme-inset px-3 py-1.5 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
          </select>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="inline-flex items-center gap-2 rounded-full bg-theme-surface px-4 py-2 text-sm shadow-sm hover:bg-theme-elevated"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <SyncTokenSettings />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-theme-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading drift events…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-apple-red/20 bg-apple-red/5 p-6 text-sm text-apple-red">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-theme-surface p-8 text-center text-theme-muted">
            No {statusFilter} drift events.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-2xl bg-theme-surface shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme-border px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{event.vendor}</span>
                    <span className="text-theme-muted">
                      {new Date(event.capturedAt).toLocaleString()}
                    </span>
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        event.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-apple-green/10 text-apple-green',
                      ].join(' ')}
                    >
                      {event.status}
                    </span>
                    <span className="text-xs text-theme-muted">{event.mapperKind}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onNavigateMapping && (
                      <button
                        type="button"
                        onClick={() => onNavigateMapping(event.vendor)}
                        className="inline-flex items-center gap-1 rounded-full bg-theme-inset px-3 py-1 text-xs hover:bg-theme-elevated"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open canvas
                      </button>
                    )}
                    {event.rawPayload && (
                      <button
                        type="button"
                        onClick={() => void handleCopyFixture(event)}
                        className="inline-flex items-center gap-1 rounded-full bg-theme-inset px-3 py-1 text-xs hover:bg-theme-elevated"
                      >
                        <Copy className="h-3 w-3" />
                        Copy fixture
                      </button>
                    )}
                    {event.status === 'pending' && (
                      <button
                        type="button"
                        disabled={ackingId === event.id}
                        onClick={() => void handleAck(event.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-apple-green/10 px-3 py-1 text-xs text-apple-green hover:bg-apple-green/20 disabled:opacity-50"
                      >
                        {ackingId === event.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Ack
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((current) => (current === event.id ? null : event.id))
                      }
                      className="rounded-full bg-theme-inset px-3 py-1 text-xs hover:bg-theme-elevated"
                    >
                      {expandedId === event.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>
                {expandedId === event.id && (
                  <div className="space-y-3 px-4 py-3 text-xs">
                    <div>
                      <p className="mb-1 font-medium text-theme-muted">Validation issues</p>
                      <pre className="overflow-auto rounded-xl bg-theme-inset p-2 font-mono">
                        {JSON.stringify(event.validationErrors, null, 2)}
                      </pre>
                    </div>
                    {event.rawPayload && (
                      <div>
                        <p className="mb-1 font-medium text-theme-muted">Raw payload</p>
                        <pre className="max-h-48 overflow-auto rounded-xl bg-theme-inset p-2 font-mono">
                          {JSON.stringify(event.rawPayload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
