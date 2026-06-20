import { GitBranch } from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'

export type SourceFieldNodeData = {
  fieldKey: string
  value: unknown
}

export function SourceFieldNode({ data }: NodeProps<SourceFieldNodeData>) {
  return (
    <div className="group min-w-[240px] overflow-visible rounded-2xl border border-theme-hairline/80 bg-[var(--color-node-surface)]/80 px-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
      <div className="flex items-center gap-2 border-b border-theme-hairline/60 bg-[var(--color-node-header)]/70 px-5 py-3">
        <GitBranch className="h-3.5 w-3.5 text-[var(--color-node-muted)]" strokeWidth={2} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-node-muted)]">
          Source
        </span>
      </div>
      <div className="relative flex items-center justify-between gap-3 px-5 py-4">
        <span className="font-system text-sm font-medium tracking-tight text-[var(--color-node-text)]">
          {data.fieldKey}
        </span>
        <Handle
          id={data.fieldKey}
          type="source"
          position={Position.Right}
          className="!-right-2 !h-4 !w-4 !translate-x-1/2 !border-[3px] !border-theme-elevated !bg-[#007AFF] !shadow-md transition group-hover:scale-110"
        />
      </div>
    </div>
  )
}
