import { useCallback, useMemo, useState } from 'react'
import { ArrowRightLeft, Download, Layers } from 'lucide-react'
import type { Edge } from 'reactflow'

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
import { SourcePayloadPanel } from './SourcePayloadPanel'

export function MappingCanvas() {
  const [edges, setEdges] = useState<Edge[]>([])
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

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

    console.log(artifact.mappings)
    console.log(serialized)

    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${GIVECAMPUS_VENDOR.toLowerCase()}-mapping.json`
    anchor.click()
    URL.revokeObjectURL(url)

    setExportStatus(`${artifact.mappings.length} mapping(s) exported`)
  }, [edges])

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="border-b-2 border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-gray-900 bg-white">
              <Layers className="h-5 w-5 text-gray-900" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-gray-900">
                UniSchema Configuration Canvas
              </h1>
              <p className="text-sm text-gray-500">
                Map vendor webhook fields to the ConstituentEvent master schema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {exportStatus && (
              <span className="text-xs font-medium text-emerald-700">{exportStatus}</span>
            )}
            <button
              type="button"
              onClick={handleExportMapping}
              className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              Export Mapping
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(240px,28%)_1fr_minmax(260px,30%)]">
        <SourcePayloadPanel
          vendor={GIVECAMPUS_VENDOR}
          payload={GIVECAMPUS_SAMPLE_PAYLOAD}
          highlightedPath={highlightedPath}
        />

        <section className="relative flex min-w-0 flex-col border-x-2 border-gray-200">
          <div className="flex items-center justify-between border-b-2 border-gray-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Mapping Canvas</h2>
              <p className="text-xs text-gray-500">
                Connect source handles to target handles
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Source → Target only
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <FlowCanvas
              payload={GIVECAMPUS_SAMPLE_PAYLOAD}
              edges={edges}
              onEdgesChange={setEdges}
              onActiveSourcePathChange={setHighlightedPath}
            />
          </div>
        </section>

        <MasterSchemaPanel connectedTargets={connectedTargets} />
      </div>

      <footer className="border-t-2 border-gray-200 bg-gray-50 px-6 py-2.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Drag from a source field node to a target field node</span>
          <span>
            Active connections:{' '}
            <span className="font-mono font-medium text-gray-900">{edges.length}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default MappingCanvas
