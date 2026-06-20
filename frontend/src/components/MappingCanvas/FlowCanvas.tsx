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
}: FlowCanvasProps) {
  const nodes = useMemo(() => buildFlowNodes(payload), [payload])

  const isValidConnection = useCallback(
    (connection: Connection) => isSourceToTargetConnection(connection, nodes),
    [nodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isSourceToTargetConnection(connection, nodes)) {
        return
      }

      onActiveSourcePathChange?.(connection.sourceHandle ?? null)
      onEdgesChange(
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#111827', strokeWidth: 2 },
          },
          dedupeTargetEdges(edges, connection),
        ),
      )
    },
    [edges, nodes, onActiveSourcePathChange, onEdgesChange],
  )

  return (
    <div className="h-full w-full bg-[#fafafa]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable
        elementsSelectable
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={24}
          size={1}
          color="#E5E7EB"
        />
        <Controls className="!rounded-md !border-2 !border-gray-900 !bg-white !shadow-none [&>button]:!border-gray-200 [&>button]:!bg-white [&>button]:!text-gray-800 [&>button:hover]:!bg-gray-50" />
        <MiniMap
          nodeColor={(node) =>
            node.type === SOURCE_FIELD_NODE_TYPE ? '#0EA5E9' : '#10B981'
          }
          maskColor="rgba(250, 250, 250, 0.85)"
          className="!rounded-md !border-2 !border-gray-900 !bg-white"
        />
      </ReactFlow>
    </div>
  )
}
