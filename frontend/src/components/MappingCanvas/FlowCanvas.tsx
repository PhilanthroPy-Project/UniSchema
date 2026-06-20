import { useCallback, useMemo } from 'react'
import dagre from '@dagrejs/dagre'
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

const NODE_WIDTH = 252
const NODE_HEIGHT = 88
const SOURCE_COLUMN_X = 48
const TARGET_COLUMN_X = 480

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#007AFF', strokeWidth: 2 },
}

type FlowCanvasProps = {
  payload: Record<string, unknown>
  edges: Edge[]
  onEdgesChange: (edges: Edge[]) => void
  onActiveSourcePathChange?: (path: string | null) => void
  readOnly?: boolean
}

function layoutNodeColumn(nodes: Node[], x: number): Node[] {
  if (nodes.length === 0) {
    return []
  }

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'TB',
    nodesep: 36,
    ranksep: 28,
    marginx: 0,
    marginy: 20,
  })

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  for (let index = 0; index < nodes.length - 1; index += 1) {
    graph.setEdge(nodes[index].id, nodes[index + 1].id)
  }

  dagre.layout(graph)

  return nodes.map((node) => {
    const position = graph.node(node.id)

    return {
      ...node,
      position: {
        x,
        y: position.y - NODE_HEIGHT / 2,
      },
    }
  })
}

function buildFlowNodes(payload: Record<string, unknown>): Node[] {
  const sourcePaths = flattenLeafPaths(buildPayloadTree(payload))

  const sourceNodes: Node[] = sourcePaths.map((path) => {
    const value = getValueAtPath(payload, path)

    return {
      id: `source-${path}`,
      type: SOURCE_FIELD_NODE_TYPE,
      position: { x: 0, y: 0 },
      data: {
        fieldKey: path,
        value,
      },
      draggable: false,
    }
  })

  const targetNodes: Node[] = MAPPABLE_TARGET_FIELDS.map((field) => ({
    id: `target-${field.key}`,
    type: TARGET_FIELD_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: { field },
    draggable: false,
  }))

  return [
    ...layoutNodeColumn(sourceNodes, SOURCE_COLUMN_X),
    ...layoutNodeColumn(targetNodes, TARGET_COLUMN_X),
  ]
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

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        animated: true,
        style: { stroke: '#007AFF', strokeWidth: 2, ...edge.style },
      })),
    [edges],
  )

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
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
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
        <Controls showInteractive={false} position="top-right" />
        <MiniMap
          className="!bottom-4 !left-4 !right-auto !top-auto !h-24 !w-36 origin-bottom-left scale-[0.72]"
          nodeColor={(node) =>
            node.type === SOURCE_FIELD_NODE_TYPE ? '#007AFF' : '#34C759'
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
