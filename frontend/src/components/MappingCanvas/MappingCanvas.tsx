import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, CloudUpload, Download, Layers, Loader2 } from 'lucide-react'
import type { Edge } from 'reactflow'

import { fetchMappingArtifact, syncMappingArtifact } from '../../api/syncMapping'
import {
  getVendorLabel,
  getVendorOption,
  VENDOR_OPTIONS,
  type VendorOption,
} from '../../data/samplePayloads'
import {
  buildMappingArtifact,
  edgesFromMappingConnections,
  getMappingsFingerprint,
  serializeMappingArtifact,
} from '../../mappingUtils'

import { SyncTokenSettings } from '../SyncTokenSettings'
import { FlowCanvas } from './FlowCanvas'
import { MasterSchemaPanel } from './MasterSchemaPanel'
import { ResizableThreeColumnLayout } from './ResizableThreeColumnLayout'
import { SourcePayloadPanel } from './SourcePayloadPanel'
import { ThemeToggle } from '../ThemeToggle'

type ActionStatus = {
  tone: 'success' | 'error'
  message: string
} | null

export function MappingCanvas() {
  const [selectedVendor, setSelectedVendor] = useState<VendorOption>(VENDOR_OPTIONS[0]!)
  const [edges, setEdges] = useState<Edge[]>([])
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<ActionStatus>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingMapping, setIsLoadingMapping] = useState(true)
  const [lastSyncedFingerprint, setLastSyncedFingerprint] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSavedMapping() {
      setIsLoadingMapping(true)
      setEdges([])
      setLastSyncedFingerprint(null)

      try {
        const stored = await fetchMappingArtifact(selectedVendor.label)

        if (cancelled) {
          return
        }

        if (!stored) {
          setLastSyncedFingerprint(getMappingsFingerprint([]))
          return
        }

        const hydratedEdges = edgesFromMappingConnections(stored.mappings)
        setEdges(hydratedEdges)
        setLastSyncedFingerprint(getMappingsFingerprint(hydratedEdges))
      } catch {
        if (!cancelled) {
          setActionStatus({
            tone: 'error',
            message: 'Unable to load saved mapping configuration',
          })
          setLastSyncedFingerprint(getMappingsFingerprint([]))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMapping(false)
        }
      }
    }

    void loadSavedMapping()

    return () => {
      cancelled = true
    }
  }, [selectedVendor.label])

  const currentFingerprint = useMemo(() => getMappingsFingerprint(edges), [edges])

  const hasUnsavedChanges =
    lastSyncedFingerprint === null
      ? edges.length > 0
      : currentFingerprint !== lastSyncedFingerprint

  const isCanvasSynced = lastSyncedFingerprint !== null && !hasUnsavedChanges

  const connectedTargets = useMemo(
    () =>
      new Set(
        edges
          .map((edge) => edge.targetHandle)
          .filter((handle): handle is string => Boolean(handle)),
      ),
    [edges],
  )

  const handleVendorChange = useCallback((slug: string) => {
    const option = getVendorOption(slug)
    if (option) {
      setSelectedVendor(option)
      setActionStatus(null)
    }
  }, [])

  const handleExportMapping = useCallback(() => {
    const artifact = buildMappingArtifact(selectedVendor.label, edges)
    const serialized = serializeMappingArtifact(artifact)

    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${selectedVendor.slug}-mapping.json`
    anchor.click()
    URL.revokeObjectURL(url)

    setActionStatus({
      tone: 'success',
      message: `${artifact.mappings.length} mapping(s) exported`,
    })
  }, [edges, selectedVendor.label, selectedVendor.slug])

  const handleSyncToEngine = useCallback(async () => {
    const artifact = buildMappingArtifact(selectedVendor.label, edges)

    setIsSyncing(true)
    setActionStatus(null)

    try {
      const result = await syncMappingArtifact(artifact)

      if (!result.success) {
        const isUnauthorized =
          result.message.toLowerCase().includes('unauthorized') ||
          result.message.toLowerCase().includes('401')

        setActionStatus({
          tone: 'error',
          message: isUnauthorized
            ? 'Sync unauthorized — set your mapping sync token (see admin guide)'
            : result.message,
        })
        return
      }

      setLastSyncedFingerprint(currentFingerprint)
      setActionStatus({
        tone: 'success',
        message: `${result.mappingCount} mapping(s) synced to engine`,
      })
    } catch {
      setActionStatus({
        tone: 'error',
        message: 'Unable to reach the sync engine. Is the backend running?',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [currentFingerprint, edges, selectedVendor.label])

  return (
    <div className="flex h-full flex-col bg-theme-bg font-system text-theme-ink transition-colors duration-300">
      <header className="shrink-0 bg-theme-surface px-6 py-4 shadow-sm backdrop-blur-xl transition-colors duration-300">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-theme-surface shadow-sm backdrop-blur-xl">
              <Layers className="h-5 w-5 text-theme-ink" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-theme-ink">
                  UniSchema Configuration Canvas
                </h1>
                {(isCanvasSynced || hasUnsavedChanges) && (
                  <span
                    className={[
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      isCanvasSynced
                        ? 'bg-apple-green/10 text-apple-green'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                    ].join(' ')}
                  >
                    {isCanvasSynced ? 'Canvas is synced' : 'Unsaved changes'}
                  </span>
                )}
              </div>
              <p className="text-sm text-theme-muted">
                Map vendor webhook fields to the ConstituentEvent master schema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-theme-muted">
              Vendor
              <select
                value={selectedVendor.slug}
                onChange={(event) => handleVendorChange(event.target.value)}
                className="rounded-full border border-theme-border bg-theme-inset px-3 py-1.5 text-sm text-theme-ink outline-none focus:ring-2 focus:ring-apple-blue-focus"
              >
                {VENDOR_OPTIONS.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
              onClick={handleExportMapping}
              className="inline-flex items-center gap-2 rounded-full bg-theme-surface px-5 py-2.5 text-sm font-medium text-theme-ink shadow-sm backdrop-blur-xl transition hover:bg-theme-elevated"
            >
              <Download className="h-4 w-4" />
              Export Mapping
            </button>
            <button
              type="button"
              onClick={handleSyncToEngine}
              disabled={isSyncing || edges.length === 0 || !hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-full bg-apple-blue-focus px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-apple-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              Sync to Engine
            </button>
          </div>
        </div>
      </header>

      <ResizableThreeColumnLayout
        left={
          <SourcePayloadPanel
            vendor={getVendorLabel(selectedVendor.slug)}
            payload={selectedVendor.samplePayload}
            highlightedPath={highlightedPath}
          />
        }
        center={
          <section className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-theme-surface shadow-sm backdrop-blur-xl transition-colors duration-300">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-theme-ink">Mapping Canvas</h2>
                <p className="text-xs text-theme-muted">
                  Connect source handles to target handles
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-theme-inset px-3 py-1.5 text-xs text-theme-muted">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Source → Target only
              </div>
            </div>
            <div className="relative min-h-0 flex-1 rounded-b-2xl bg-theme-canvas transition-colors duration-300">
              {isLoadingMapping ? (
                <div className="flex h-full items-center justify-center text-sm text-theme-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading saved mapping…
                </div>
              ) : (
                <FlowCanvas
                  payload={selectedVendor.samplePayload}
                  edges={edges}
                  onEdgesChange={setEdges}
                  onActiveSourcePathChange={setHighlightedPath}
                />
              )}
            </div>
          </section>
        }
        right={<MasterSchemaPanel connectedTargets={connectedTargets} />}
      />

      <footer className="shrink-0 bg-theme-surface px-6 py-2.5 shadow-sm backdrop-blur-xl transition-colors duration-300">
        <div className="flex items-center justify-between text-xs text-theme-muted">
          <span>Drag from a source field node to a target field node</span>
          <span>
            Active connections:{' '}
            <span className="font-medium text-theme-ink">{edges.length}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default MappingCanvas
