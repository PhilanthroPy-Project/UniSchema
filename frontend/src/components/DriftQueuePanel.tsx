import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

import { fetchDriftEvents, type DriftEventSummary } from '../api/driftEvents'
import { SyncTokenSettings } from './SyncTokenSettings'
import { ThemeToggle } from './ThemeToggle'

type DriftQueuePanelProps = {
  onNavigateMapping?: () => void
}

export function DriftQueuePanel({ onNavigateMapping }: DriftQueuePanelProps) {
  const [events, setEvents] = useState<DriftEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'processed'>('pending')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchDriftEvents(statusFilter)
      setEvents(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load drift events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

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
              Schema validation failures — metadata only (payloads require agent token)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
            {statusFilter === 'pending' && onNavigateMapping && (
              <p className="mt-2 text-sm">
                Webhook payloads that fail Zod validation appear here for operator review.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-theme-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-theme-border bg-theme-inset text-xs uppercase text-theme-muted">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Captured</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Mapper</th>
                  <th className="px-4 py-3">Validation issues</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-theme-border last:border-0">
                    <td className="px-4 py-3 font-medium">{event.vendor}</td>
                    <td className="px-4 py-3 text-theme-muted">
                      {new Date(event.capturedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-theme-muted">{event.mapperKind}</td>
                    <td className="px-4 py-3 text-theme-muted">
                      {event.validationErrors.formErrors?.length ?? 0} form /{' '}
                      {Object.keys(event.validationErrors.fieldErrors ?? {}).length} field
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
