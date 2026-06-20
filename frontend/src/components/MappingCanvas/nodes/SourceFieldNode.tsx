import { GitBranch } from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'

export type SourceFieldNodeData = {
  fieldKey: string
  value: unknown
}

export function SourceFieldNode({ data }: NodeProps<SourceFieldNodeData>) {
  return (
    <div className="group min-w-[220px] rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center gap-2 border-b border-gray-200/50 bg-gray-50/30 px-4 py-2.5">
        <GitBranch className="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
          Source
        </span>
      </div>
      <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
        <span className="font-system text-sm font-medium text-gray-800 tracking-tight">
          {data.fieldKey}
        </span>
        <Handle
          id={data.fieldKey}
          type="source"
          position={Position.Right}
          className="!h-3.5 !w-3.5 !border-[3px] !border-white !bg-[#007AFF] !shadow-sm transition group-hover:scale-110"
        />
      </div>
    </div>
  )
}
