import {
  CloudUpload,
  Download,
  Layers,
  Loader2,
  Play,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import { fetchVendors, mergeVendorOptions, tierLabel } from '../../api/vendors'
import {
  getVendorOption,
  VENDOR_OPTIONS,
  type VendorOption,
} from '../../data/samplePayloads'
import { Badge } from '../ui/badge'
import { SyncTokenSettings } from '../SyncTokenSettings'
import { ThemeToggle } from '../ThemeToggle'
import type { MappingProjectStatus } from '../../store/mappingStoreTypes'

type VendorOptionWithTier = VendorOption & { tier?: 1 | 2 | 3 }

type ActionStatus = {
  tone: 'success' | 'error'
  message: string
} | null

type MappingToolbarProps = {
  vendorOptions: VendorOptionWithTier[]
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
}

function statusBadge(status: MappingProjectStatus, isDirty: boolean, isSynced: boolean) {
  if (isSynced) {
    return <Badge variant="success">Synced</Badge>
  }

  if (isDirty) {
    return <Badge variant="warning">Unsaved changes</Badge>
  }

  if (status === 'validated') {
    return <Badge variant="success">Validated</Badge>
  }

  if (status === 'deployed') {
    return <Badge variant="success">Deployed</Badge>
  }

  return <Badge variant="muted">Draft</Badge>
}

export function MappingToolbar({
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
}: MappingToolbarProps) {
  const selectedVendor =
    vendorOptions.find((option) => option.slug === selectedVendorSlug) ?? VENDOR_OPTIONS[0]!

  return (
    <header className="shrink-0 bg-theme-surface px-6 py-4 shadow-sm backdrop-blur-xl transition-colors duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-theme-surface shadow-sm backdrop-blur-xl">
            <Layers className="h-5 w-5 text-theme-ink" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-theme-ink">
                UniSchema Mapper
              </h1>
              {statusBadge(status, isDirty, isSynced)}
            </div>
            <p className="text-sm text-theme-muted">
              Map vendor webhook fields to the ConstituentEvent master schema
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-theme-muted">
            Vendor
            <select
              data-testid="vendor-select"
              value={selectedVendorSlug}
              onChange={(event) => onVendorChange(event.target.value)}
              className="rounded-full border border-theme-border bg-theme-inset px-3 py-1.5 text-sm text-theme-ink outline-none focus:ring-2 focus:ring-apple-blue-focus"
            >
              {vendorOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                  {option.tier ? ` (${tierLabel(option.tier)})` : ''}
                </option>
              ))}
            </select>
          </label>

          {'tier' in selectedVendor && selectedVendor.tier === 3 && (
            <Badge variant="warning">Verify with your payloads</Badge>
          )}

          {actionStatus && (
            <span
              className={[
                'text-xs font-medium',
                actionStatus.tone === 'success' ? 'text-apple-green' : 'text-apple-red',
              ].join(' ')}
            >
              {actionStatus.message}
            </span>
          )}

          <SyncTokenSettings />
          <ThemeToggle />

          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center gap-2 rounded-full bg-theme-surface px-4 py-2.5 text-sm font-medium text-theme-ink shadow-sm backdrop-blur-xl transition hover:bg-theme-elevated"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-full bg-theme-surface px-4 py-2.5 text-sm font-medium text-theme-ink shadow-sm backdrop-blur-xl transition hover:bg-theme-elevated"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            type="button"
            data-testid="validate-button"
            onClick={onValidate}
            className="inline-flex items-center gap-2 rounded-full bg-theme-surface px-4 py-2.5 text-sm font-medium text-theme-ink shadow-sm backdrop-blur-xl transition hover:bg-theme-elevated"
          >
            <ShieldCheck className="h-4 w-4" />
            Validate Mapping
          </button>
          <button
            type="button"
            data-testid="preview-button"
            onClick={onPreview}
            className="inline-flex items-center gap-2 rounded-full bg-theme-surface px-4 py-2.5 text-sm font-medium text-theme-ink shadow-sm backdrop-blur-xl transition hover:bg-theme-elevated"
          >
            <Play className="h-4 w-4" />
            Preview Data
          </button>
          <button
            type="button"
            data-testid="sync-button"
            onClick={onDeploy}
            disabled={isDeployDisabled || isSyncing}
            className="inline-flex items-center gap-2 rounded-full bg-apple-blue-focus px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-apple-blue disabled:cursor-not-allowed disabled:opacity-50"
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
  )
}

export function useVendorOptions(): VendorOptionWithTier[] {
  return VENDOR_OPTIONS
}

export async function loadVendorOptions(): Promise<VendorOptionWithTier[]> {
  try {
    const registry = await fetchVendors()
    const merged = mergeVendorOptions(registry)
    return merged.length > 0 ? merged : VENDOR_OPTIONS
  } catch {
    return VENDOR_OPTIONS
  }
}

export function resolveVendorOption(
  slug: string,
  options: VendorOptionWithTier[],
): VendorOptionWithTier {
  return getVendorOption(slug) ?? options[0] ?? VENDOR_OPTIONS[0]!
}
