import { GitBranch } from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'

export type SourceFieldNodeData = {
  fieldKey: string
  value: unknown
}

export function SourceFieldNode({ data }: NodeProps<SourceFieldNodeData>) {
  return (
    <div className="group min-w-[220px] rounded-md border-2 border-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <GitBranch className="h-3.5 w-3.5 text-gray-500" strokeWidth={2.5} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          Source
        </span>
      </div>
      <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
        <span className="font-mono text-sm font-medium text-gray-900">
          {data.fieldKey}
        </span>
        <Handle
          id={data.fieldKey}
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-gray-900 !bg-sky-500 transition group-hover:!bg-sky-400"
        />
      </div>
    </div>
  )
}
