import { useEffect, useState } from 'react'
import { Activity, Database, HardDrive } from 'lucide-react'

type HealthPayload = {
  status: string
  version: string
  egressTarget: string
  driftPendingCount: number
  pendingIngestionCount: number
  redisRateLimit: boolean
  ingestQueue: string
}

export function OperatorDashboard() {
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/health')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Health check failed (${response.status})`)
        }

        return response.json() as Promise<HealthPayload>
      })
      .then(setHealth)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load health')
      })
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-apple-red/20 bg-apple-red/5 p-6 text-sm text-apple-red">
        {error}
      </div>
    )
  }

  if (!health) {
    return <div className="p-6 text-sm text-theme-muted">Loading operator dashboard…</div>
  }

  return (
    <div className="grid gap-4 p-6 md:grid-cols-3">
      <article className="rounded-2xl bg-theme-surface p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-theme-muted">
          <Activity className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">System</span>
        </div>
        <p className="text-lg font-semibold">{health.status}</p>
        <p className="text-sm text-theme-muted">v{health.version}</p>
      </article>
      <article className="rounded-2xl bg-theme-surface p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-theme-muted">
          <Database className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Queue</span>
        </div>
        <p className="text-lg font-semibold">{health.pendingIngestionCount} pending ingestions</p>
        <p className="text-sm text-theme-muted">{health.driftPendingCount} drift events · {health.ingestQueue}</p>
      </article>
      <article className="rounded-2xl bg-theme-surface p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-theme-muted">
          <HardDrive className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Egress</span>
        </div>
        <p className="text-lg font-semibold">{health.egressTarget}</p>
        <p className="text-sm text-theme-muted">
          Redis rate limit: {health.redisRateLimit ? 'enabled' : 'in-process'}
        </p>
      </article>
    </div>
  )
}
