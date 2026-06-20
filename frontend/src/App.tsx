import { useState } from 'react'
import { AlertTriangle, Layers } from 'lucide-react'

import { DriftQueuePanel } from './components/DriftQueuePanel'
import MappingCanvas from './components/MappingCanvas'

type AppView = 'mapping' | 'drift'

export default function App() {
  const [view, setView] = useState<AppView>('mapping')
  const [mappingVendorSlug, setMappingVendorSlug] = useState<string | undefined>()

  const openMappingForVendor = (vendorSlug: string) => {
    setMappingVendorSlug(vendorSlug)
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
      </nav>
      <div className="min-h-0 flex-1">
        {view === 'mapping' ? (
          <MappingCanvas initialVendorSlug={mappingVendorSlug} />
        ) : (
          <DriftQueuePanel onNavigateMapping={openMappingForVendor} />
        )}
      </div>
    </div>
  )
}
