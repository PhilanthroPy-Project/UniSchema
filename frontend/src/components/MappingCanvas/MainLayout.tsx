import type { ReactNode } from 'react'
import {
  CloudUpload,
  Download,
  Loader2,
  Play,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import { tierLabel } from '../../api/vendors'
import type { MappingProjectStatus } from '../../store/mappingStoreTypes'
import { useMappingStore } from '../../store/useMappingStore'
import { SyncTokenSettings } from '../SyncTokenSettings'
import { Badge } from '../ui/badge'
import { ResizableThreeColumnLayout } from './ResizableThreeColumnLayout'

type VendorOption = {
  slug: string
  label: string
  tier?: 1 | 2 | 3
}

type ActionStatus = {
  tone: 'success' | 'error'
  message: string
} | null

export type MainLayoutProps = {
  vendorOptions: VendorOption[]
  selectedVendorSlug: string
  status: MappingProjectStatus
  isDirty: boolean
  isSynced: boolean
  isSyncing: boolean
  isDeployDisabled: boolean
  actionStatus: ActionStatus
  onVendorChange: (slug: string) => void
  onValidate: () => void
  onPreview: () => void
  onDeploy: () => void
  onImport: () => void
  onExport: () => void
  leftPanel: ReactNode
  centerPanel: ReactNode
  rightPanel: ReactNode
}

function SyncStatusBadge({
  status,
  isDirty,
  isSynced,
}: {
  status: MappingProjectStatus
  isDirty: boolean
  isSynced: boolean
}) {
  if (isSynced) {
    return <Badge variant="success">Synced</Badge>
  }

  if (isDirty) {
    return <Badge variant="warning">Unsaved</Badge>
  }

  if (status === 'validated' || status === 'deployed') {
    return <Badge variant="success">{status === 'deployed' ? 'Deployed' : 'Validated'}</Badge>
  }

  return <Badge variant="muted">Draft</Badge>
}

export function MainLayout({
  vendorOptions,
  selectedVendorSlug,
  status,
  isDirty,
  isSynced,
  isSyncing,
  isDeployDisabled,
  actionStatus,
  onVendorChange,
  onValidate,
  onPreview,
  onDeploy,
  onImport,
  onExport,
  leftPanel,
  centerPanel,
  rightPanel,
}: MainLayoutProps) {
  const activeConnections = useMappingStore((state) => state.edges.length)

  const selectedVendor =
    vendorOptions.find((option) => option.slug === selectedVendorSlug) ?? vendorOptions[0]

  return (
    <div className="flex h-full flex-col bg-[#121212] font-system text-zinc-100">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">
              UniSchema Mapper
            </h1>
            <SyncStatusBadge status={status} isDirty={isDirty} isSynced={isSynced} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              Vendor
              <select
                data-testid="vendor-select"
                value={selectedVendorSlug}
                onChange={(event) => onVendorChange(event.target.value)}
                className="rounded-lg border border-zinc-800/50 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {vendorOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                    {option.tier ? ` (${tierLabel(option.tier)})` : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedVendor?.tier === 3 && (
              <Badge variant="warning">Verify payloads</Badge>
            )}

            {actionStatus && (
              <span
                className={[
                  'text-xs font-medium',
                  actionStatus.tone === 'success' ? 'text-emerald-400' : 'text-red-400',
                ].join(' ')}
              >
                {actionStatus.message}
              </span>
            )}

            <SyncTokenSettings />

            <button
              type="button"
              onClick={onImport}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              data-testid="validate-button"
              onClick={onValidate}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              <ShieldCheck className="h-4 w-4" />
              Validate Mapping
            </button>
            <button
              type="button"
              data-testid="preview-button"
              onClick={onPreview}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              <Play className="h-4 w-4" />
              Preview Data
            </button>
            <button
              type="button"
              data-testid="sync-button"
              onClick={onDeploy}
              disabled={isDeployDisabled || isSyncing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              Deploy
            </button>
          </div>
        </div>
      </header>

      <ResizableThreeColumnLayout
        left={
          <div className="flex h-full flex-col gap-3">
            {leftPanel}
          </div>
        }
        center={
          <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/40">
            {centerPanel}
          </section>
        }
        right={
          <div className="h-full overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/40">
            {rightPanel}
          </div>
        }
      />

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-zinc-800 px-4 text-xs text-zinc-500">
        <span>
          Click a node or edge to edit properties · Press Backspace to remove a connection
        </span>
        <span className="flex items-center gap-3 whitespace-nowrap">
          <span>
            Active connections:{' '}
            <span className="font-medium text-zinc-400">{activeConnections}</span>
          </span>
          <span>Crafted with ❤️ by Shivam</span>
        </span>
      </footer>
    </div>
  )
}
