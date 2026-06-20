import { useCallback, useMemo, useState } from 'react'
import {
  ArrowRightLeft,
  Database,
  GitBranch,
  Layers,
} from 'lucide-react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'

type SourceField = 'id' | 'donation_type' | 'value' | 'currency' | 'donor_email'
type DestinationField =
  | 'eventId'
  | 'constituentEmail'
  | 'eventType'
  | 'amount'
  | 'currency'

type SourceNodeData = {
  label: string
  fields: SourceField[]
}

type DestinationNodeData = {
  label: string
  fields: DestinationField[]
}

type MappingConnection = {
  source: SourceField
  target: DestinationField
}

const SOURCE_FIELDS: SourceField[] = [
  'id',
  'donation_type',
  'value',
  'currency',
  'donor_email',
]

const DESTINATION_FIELDS: DestinationField[] = [
  'eventId',
  'constituentEmail',
  'eventType',
  'amount',
  'currency',
]

function SourceNode({ data }: NodeProps<SourceNodeData>) {
  return (
    <div className="min-w-[260px] rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
        <GitBranch className="h-4 w-4 text-slate-300" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Source Webhook
          </p>
          <p className="text-sm font-medium text-slate-100">{data.label}</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-800">
        {data.fields.map((field) => (
          <li
            key={field}
            className="relative flex items-center justify-between px-4 py-2.5 text-sm text-slate-200"
          >
            <span className="font-mono text-xs text-slate-300">{field}</span>
            <Handle
              id={field}
              type="source"
              position={Position.Right}
              className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-sky-400"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function DestinationNode({ data }: NodeProps<DestinationNodeData>) {
  return (
    <div className="min-w-[260px] rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
        <Database className="h-4 w-4 text-slate-300" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Master Schema
          </p>
          <p className="text-sm font-medium text-slate-100">{data.label}</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-800">
        {data.fields.map((field) => (
          <li
            key={field}
            className="relative flex items-center justify-between px-4 py-2.5 text-sm text-slate-200"
          >
            <Handle
              id={field}
              type="target"
              position={Position.Left}
              className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-emerald-400"
            />
            <span className="ml-3 font-mono text-xs text-slate-300">{field}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const nodeTypes = {
  sourceNode: SourceNode,
  destinationNode: DestinationNode,
}

const initialNodes: Node[] = [
  {
    id: 'source-givecampus',
    type: 'sourceNode',
    position: { x: 80, y: 120 },
    data: {
      label: 'GiveCampus Webhook',
      fields: SOURCE_FIELDS,
    } satisfies SourceNodeData,
    draggable: false,
  },
  {
    id: 'destination-master',
    type: 'destinationNode',
    position: { x: 560, y: 120 },
    data: {
      label: 'ConstituentEvent',
      fields: DESTINATION_FIELDS,
    } satisfies DestinationNodeData,
    draggable: false,
  },
]

function toMappingConnections(edges: Edge[]): MappingConnection[] {
  return edges
    .filter(
      (edge): edge is Edge & { sourceHandle: SourceField; targetHandle: DestinationField } =>
        Boolean(edge.sourceHandle && edge.targetHandle),
    )
    .map((edge) => ({
      source: edge.sourceHandle,
      target: edge.targetHandle,
    }))
}

export default function App() {
  const [nodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>([])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((currentEdges) => addEdge(connection, currentEdges))
  }, [])

  const activeConnectionCount = useMemo(() => edges.length, [edges])

  const handleGenerateMappingConfig = useCallback(() => {
    const mappingConfig = toMappingConnections(edges)
    console.log(mappingConfig)
  }, [edges])

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800">
              <Layers className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-50">
                UniSchema Visual Mapper
              </h1>
              <p className="text-sm text-slate-400">
                Connect external webhook fields to the Master Schema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateMappingConfig}
            className="inline-flex items-center gap-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Generate Mapping Config
          </button>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="absolute inset-0 border-t border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_45%)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#334155"
            />
            <Controls className="!border-slate-700 !bg-slate-900 !shadow-lg [&>button]:!border-slate-700 [&>button]:!bg-slate-800 [&>button]:!text-slate-200 [&>button:hover]:!bg-slate-700" />
          </ReactFlow>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/90 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-slate-400">
          <span>Drag from a source field handle to a destination field handle</span>
          <span>
            Active connections:{' '}
            <span className="font-mono text-slate-200">{activeConnectionCount}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
