import { Database } from 'lucide-react'

import { useMappingStore } from '../../store/useMappingStore'
import { buildPayloadTree, flattenLeafPaths } from '../../utils/payloadTree'
import { MasterSchemaPanel } from './MasterSchemaPanel'
import { PropertiesPanel } from './PropertiesPanel'

export function RightSidebarPanel() {
  const selection = useMappingStore((state) => state.selection)
  const edges = useMappingStore((state) => state.edges)
  const metadataMappings = useMappingStore((state) => state.metadataMappings)
  const vendorPayload = useMappingStore((state) => state.vendorPayload)
  const setMetadataMappings = useMappingStore((state) => state.setMetadataMappings)
  const clearSelection = useMappingStore((state) => state.clearSelection)

  const sourcePaths = flattenLeafPaths(buildPayloadTree(vendorPayload))
  const connectedTargets = new Set(
    edges
      .map((edge) => edge.data?.targetField ?? edge.targetHandle)
      .filter((handle): handle is string => Boolean(handle)),
  )

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/60">
      {selection ? (
        <PropertiesPanel onBack={clearSelection} />
      ) : (
        <>
          <div className="px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-theme-inset">
                <Database className="h-4 w-4 text-theme-muted" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-theme-ink">Master Schema</h2>
                <p className="text-xs text-theme-muted">
                  Select a node or edge to edit properties
                </p>
              </div>
            </div>
          </div>
          <MasterSchemaPanel
            connectedTargets={connectedTargets}
            sourcePaths={sourcePaths}
            metadataMappings={metadataMappings}
            onMetadataMappingsChange={setMetadataMappings}
            embedded
          />
        </>
      )}
    </aside>
  )
}
