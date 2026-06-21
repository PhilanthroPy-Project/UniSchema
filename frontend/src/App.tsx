import { useState } from 'react'
import { Activity, AlertTriangle, Layers } from 'lucide-react'

import { OperatorDashboard } from './components/OperatorDashboard'
import { DriftQueuePanel } from './components/DriftQueuePanel'
import MappingCanvas from './components/MappingCanvas'

type AppView = 'mapping' | 'drift' | 'operator'

export default function App() {
  const [view, setView] = useState<AppView>('mapping')
  const [mappingVendorSlug, setMappingVendorSlug] = useState<string | undefined>()
  const [mappingPayload, setMappingPayload] = useState<Record<string, unknown> | null>(null)

  const openMappingForVendor = (vendorSlug: string, payload?: Record<string, unknown>) => {
    setMappingVendorSlug(vendorSlug)
    setMappingPayload(payload ?? null)
    setView('mapping')
  }

  return (
    <div className="flex h-screen flex-col">
      <nav className="flex shrink-0 items-center gap-1 border-b border-theme-border bg-theme-surface px-4 py-2">
        <button
          type="button"
          onClick={() => setView('mapping')}
          className={[
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
            view === 'mapping'
              ? 'bg-apple-blue-focus text-white'
              : 'text-theme-muted hover:bg-theme-inset hover:text-theme-ink',
          ].join(' ')}
        >
          <Layers className="h-4 w-4" />
          Mapping Canvas
        </button>
        <button
          type="button"
          onClick={() => setView('drift')}
          className={[
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
            view === 'drift'
              ? 'bg-apple-blue-focus text-white'
              : 'text-theme-muted hover:bg-theme-inset hover:text-theme-ink',
          ].join(' ')}
        >
          <AlertTriangle className="h-4 w-4" />
          Drift Queue
        </button>
        <button
          type="button"
          onClick={() => setView('operator')}
          className={[
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
            view === 'operator'
              ? 'bg-apple-blue-focus text-white'
              : 'text-theme-muted hover:bg-theme-inset hover:text-theme-ink',
          ].join(' ')}
        >
          <Activity className="h-4 w-4" />
          Operator
        </button>
      </nav>
      <div className="min-h-0 flex-1">
        {view === 'mapping' ? (
          <MappingCanvas initialVendorSlug={mappingVendorSlug} initialPayload={mappingPayload} />
        ) : view === 'drift' ? (
          <DriftQueuePanel onNavigateMapping={openMappingForVendor} />
        ) : (
          <OperatorDashboard />
        )}
      </div>
    </div>
  )
}
