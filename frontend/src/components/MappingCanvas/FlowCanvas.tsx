import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useTheme } from '../../context/ThemeContext'
import { MAPPABLE_TARGET_FIELDS } from '../../types/constituentEvent'
import {
  SOURCE_FIELD_NODE_TYPE,
  TARGET_FIELD_NODE_TYPE,
  dedupeTargetEdges,
  isSourceToTargetConnection,
} from '../../utils/connectionValidation'
import {
  buildPayloadTree,
  flattenLeafPaths,
  getValueAtPath,
} from '../../utils/payloadTree'
import { SourceFieldNode } from './nodes/SourceFieldNode'
import { TargetFieldNode } from './nodes/TargetFieldNode'

const nodeTypes = {
  [SOURCE_FIELD_NODE_TYPE]: SourceFieldNode,
  [TARGET_FIELD_NODE_TYPE]: TargetFieldNode,
}

const SOURCE_NODE_X = 48
const TARGET_NODE_X = 420
const NODE_VERTICAL_GAP = 88
const CANVAS_TOP_OFFSET = 32

type FlowCanvasProps = {
  payload: Record<string, unknown>
  edges: Edge[]
  onEdgesChange: (edges: Edge[]) => void
  onActiveSourcePathChange?: (path: string | null) => void
  readOnly?: boolean
}

function buildFlowNodes(payload: Record<string, unknown>): Node[] {
  const sourcePaths = flattenLeafPaths(buildPayloadTree(payload))

  const sourceNodes: Node[] = sourcePaths.map((path, index) => {
    const value = getValueAtPath(payload, path)

    return {
      id: `source-${path}`,
      type: SOURCE_FIELD_NODE_TYPE,
      position: {
        x: SOURCE_NODE_X,
        y: CANVAS_TOP_OFFSET + index * NODE_VERTICAL_GAP,
      },
      data: {
        fieldKey: path,
        value,
      },
      draggable: false,
    }
  })

  const targetNodes: Node[] = MAPPABLE_TARGET_FIELDS.map((field, index) => ({
    id: `target-${field.key}`,
    type: TARGET_FIELD_NODE_TYPE,
    position: {
      x: TARGET_NODE_X,
      y: CANVAS_TOP_OFFSET + index * NODE_VERTICAL_GAP,
    },
    data: { field },
    draggable: false,
  }))

  return [...sourceNodes, ...targetNodes]
}

export function FlowCanvas({
  payload,
  edges,
  onEdgesChange,
  onActiveSourcePathChange,
  readOnly = false,
}: FlowCanvasProps) {
  const { isDark } = useTheme()
  const nodes = useMemo(() => buildFlowNodes(payload), [payload])

  const isValidConnection = useCallback(
    (connection: Connection) => isSourceToTargetConnection(connection, nodes),
    [nodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly || !isSourceToTargetConnection(connection, nodes)) {
        return
      }

      onActiveSourcePathChange?.(connection.sourceHandle ?? null)
      onEdgesChange(
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#007AFF', strokeWidth: 2 },
          },
          dedupeTargetEdges(edges, connection),
        ),
      )
    },
    [edges, nodes, onActiveSourcePathChange, onEdgesChange, readOnly],
  )

  return (
    <div className="relative h-full w-full bg-theme-canvas transition-colors duration-300">
      {readOnly && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-theme-surface px-3 py-1.5 text-xs font-medium text-apple-green shadow-sm backdrop-blur-xl">
            Synced with engine — editing locked
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        edgesFocusable={!readOnly}
        className="bg-theme-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? '#48484a' : '#E5E5EA'}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) =>
            node.type === SOURCE_FIELD_NODE_TYPE ? '#007AFF' : '#34C759'
          }
          maskColor={isDark ? 'rgba(20, 20, 22, 0.75)' : 'rgba(245, 245, 247, 0.85)'}
          maskStrokeColor={isDark ? '#48484a' : '#E5E5EA'}
        />
      </ReactFlow>
    </div>
  )
}
