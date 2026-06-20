import { useCallback, useMemo, useState } from 'react'
import { ArrowRightLeft, CloudUpload, Download, Layers, Loader2 } from 'lucide-react'
import type { Edge } from 'reactflow'

import { syncMappingArtifact } from '../../api/syncMapping'
import {
  GIVECAMPUS_SAMPLE_PAYLOAD,
  GIVECAMPUS_VENDOR,
} from '../../data/samplePayloads'
import {
  buildMappingArtifact,
  serializeMappingArtifact,
} from '../../mappingUtils'

import { FlowCanvas } from './FlowCanvas'
import { MasterSchemaPanel } from './MasterSchemaPanel'
import { ResizableThreeColumnLayout } from './ResizableThreeColumnLayout'
import { SourcePayloadPanel } from './SourcePayloadPanel'

type ActionStatus = {
  tone: 'success' | 'error'
  message: string
} | null

export function MappingCanvas() {
  const [edges, setEdges] = useState<Edge[]>([])
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<ActionStatus>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const connectedTargets = useMemo(
    () =>
      new Set(
        edges
          .map((edge) => edge.targetHandle)
          .filter((handle): handle is string => Boolean(handle)),
      ),
    [edges],
  )

  const handleExportMapping = useCallback(() => {
    const artifact = buildMappingArtifact(GIVECAMPUS_VENDOR, edges)
    const serialized = serializeMappingArtifact(artifact)

    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${GIVECAMPUS_VENDOR.toLowerCase()}-mapping.json`
    anchor.click()
    URL.revokeObjectURL(url)

    setActionStatus({
      tone: 'success',
      message: `${artifact.mappings.length} mapping(s) exported`,
    })
  }, [edges])

  const handleSyncToEngine = useCallback(async () => {
    const artifact = buildMappingArtifact(GIVECAMPUS_VENDOR, edges)

    setIsSyncing(true)
    setActionStatus(null)

    try {
      const result = await syncMappingArtifact(artifact)

      if (!result.success) {
        setActionStatus({
          tone: 'error',
          message: result.message,
        })
        return
      }

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
  }, [edges])

  return (
    <div className="flex h-screen flex-col bg-[#F5F5F7] font-system text-apple-ink">
      <header className="shrink-0 bg-white/80 px-6 py-4 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm backdrop-blur-xl">
              <Layers className="h-5 w-5 text-apple-ink" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-apple-ink">
                UniSchema Configuration Canvas
              </h1>
              <p className="text-sm text-apple-muted">
                Map vendor webhook fields to the ConstituentEvent master schema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={handleExportMapping}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-5 py-2.5 text-sm font-medium text-apple-ink shadow-sm backdrop-blur-xl transition hover:bg-white"
            >
              <Download className="h-4 w-4" />
              Export Mapping
            </button>
            <button
              type="button"
              onClick={handleSyncToEngine}
              disabled={isSyncing || edges.length === 0}
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
            vendor={GIVECAMPUS_VENDOR}
            payload={GIVECAMPUS_SAMPLE_PAYLOAD}
            highlightedPath={highlightedPath}
          />
        }
        center={
          <section className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-apple-ink">Mapping Canvas</h2>
                <p className="text-xs text-apple-muted">
                  Connect source handles to target handles
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F7]/80 px-3 py-1.5 text-xs text-apple-muted">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Source → Target only
              </div>
            </div>
            <div className="relative min-h-0 flex-1 rounded-b-2xl bg-[#F5F5F7]">
              <FlowCanvas
                payload={GIVECAMPUS_SAMPLE_PAYLOAD}
                edges={edges}
                onEdgesChange={setEdges}
                onActiveSourcePathChange={setHighlightedPath}
              />
            </div>
          </section>
        }
        right={<MasterSchemaPanel connectedTargets={connectedTargets} />}
      />

      <footer className="shrink-0 bg-white/60 px-6 py-2.5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs text-apple-muted">
          <span>Drag from a source field node to a target field node</span>
          <span>
            Active connections:{' '}
            <span className="font-medium text-apple-ink">{edges.length}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default MappingCanvas
