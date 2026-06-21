import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Connection,
  type EdgeMouseHandler,
  type NodeMouseHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useTheme } from '../../context/ThemeContext'
import { MAPPING_EDGE_TYPE } from '../../store/mappingStorePure'
import {
  MASTER_SCHEMA_NODE_TYPE,
  VENDOR_NODE_TYPE,
  useMappingStore,
} from '../../store/useMappingStore'
import { isVendorToMasterConnection } from '../../utils/connectionValidation'
import { MappingEdge } from './edges/MappingEdge'
import { MasterSchemaNode } from './nodes/MasterSchemaNode'
import { VendorNode } from './nodes/VendorNode'

const nodeTypes = {
  [VENDOR_NODE_TYPE]: VendorNode,
  [MASTER_SCHEMA_NODE_TYPE]: MasterSchemaNode,
}

const edgeTypes = {
  [MAPPING_EDGE_TYPE]: MappingEdge,
}

const defaultEdgeOptions = {
  type: MAPPING_EDGE_TYPE,
  animated: true,
  style: { stroke: '#007AFF', strokeWidth: 2 },
}

type FlowCanvasProps = {
  onActiveSourcePathChange?: (path: string | null) => void
  readOnly?: boolean
}

export function FlowCanvas({
  onActiveSourcePathChange,
  readOnly = false,
}: FlowCanvasProps) {
  const { isDark } = useTheme()

  const nodes = useMappingStore((state) => state.nodes)
  const edges = useMappingStore((state) => state.edges)
  const selection = useMappingStore((state) => state.selection)
  const connectEdge = useMappingStore((state) => state.connectEdge)
  const removeEdge = useMappingStore((state) => state.removeEdge)
  const setSelection = useMappingStore((state) => state.setSelection)
  const clearSelection = useMappingStore((state) => state.clearSelection)

  const nodesWithSelection = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: selection?.kind === 'node' && selection.nodeId === node.id,
      })),
    [nodes, selection],
  )

  const edgesWithSelection = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: edge.type ?? MAPPING_EDGE_TYPE,
        selected: selection?.kind === 'edge' && selection.edgeId === edge.id,
        animated: true,
        style: {
          stroke: '#007AFF',
          strokeWidth: 2,
          ...edge.style,
        },
      })),
    [edges, selection],
  )

  const isValidConnection = useCallback(
    (connection: Connection) => isVendorToMasterConnection(connection, nodes),
    [nodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly || !isVendorToMasterConnection(connection, nodes)) {
        return
      }

      onActiveSourcePathChange?.(connection.sourceHandle ?? null)
      connectEdge(connection)
    },
    [connectEdge, nodes, onActiveSourcePathChange, readOnly],
  )

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (readOnly) {
        return
      }

      if (node.type === VENDOR_NODE_TYPE) {
        onActiveSourcePathChange?.(node.data.fieldPath)
      }

      setSelection({ kind: 'node', nodeId: node.id })
    },
    [onActiveSourcePathChange, readOnly, setSelection],
  )

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      if (readOnly) {
        return
      }

      onActiveSourcePathChange?.(edge.data?.sourcePath ?? edge.sourceHandle ?? null)
      setSelection({ kind: 'edge', edgeId: edge.id })
    },
    [onActiveSourcePathChange, readOnly, setSelection],
  )

  const onPaneClick = useCallback(() => {
    clearSelection()
    onActiveSourcePathChange?.(null)
  }, [clearSelection, onActiveSourcePathChange])

  const onEdgesDelete = useCallback(
    (deletedEdges: { id: string }[]) => {
      if (readOnly) {
        return
      }

      deletedEdges.forEach((edge) => removeEdge(edge.id))
    },
    [readOnly, removeEdge],
  )

  return (
    <div className="relative h-full w-full bg-theme-canvas transition-colors duration-300">
      {readOnly && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-theme-surface px-3 py-1.5 text-xs font-medium text-apple-green shadow-sm backdrop-blur-xl">
            Deployed — editing locked
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edgesWithSelection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onEdgesDelete={onEdgesDelete}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        edgesFocusable={!readOnly}
        deleteKeyCode={readOnly ? null : 'Backspace'}
        className="bg-theme-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? '#48484a' : '#E5E5EA'}
        />
        <Controls showInteractive={false} position="top-right" />
        <MiniMap
          className="!bottom-4 !left-4 !right-auto !top-auto !h-24 !w-36 origin-bottom-left scale-[0.72]"
          nodeColor={(node) =>
            node.type === VENDOR_NODE_TYPE ? '#007AFF' : '#34C759'
          }
          maskColor={isDark ? 'rgba(20, 20, 22, 0.75)' : 'rgba(245, 245, 247, 0.85)'}
          maskStrokeColor={isDark ? '#48484a' : '#E5E5EA'}
          zoomable={false}
          pannable={false}
        />
      </ReactFlow>
    </div>
  )
}
