import { GitBranch } from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'

export type SourceFieldNodeData = {
  fieldKey: string
  value: unknown
}

export function SourceFieldNode({ data }: NodeProps<SourceFieldNodeData>) {
  return (
    <div className="group min-w-[220px] overflow-hidden rounded-2xl border border-[var(--color-node-border)] bg-[var(--color-node-surface)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
      <div className="flex items-center gap-2 border-b border-theme-hairline/50 bg-[var(--color-node-header)] px-4 py-2.5">
        <GitBranch className="h-3.5 w-3.5 text-[var(--color-node-muted)]" strokeWidth={2} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-node-muted)]">
          Source
        </span>
      </div>
      <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
        <span className="font-system text-sm font-medium tracking-tight text-[var(--color-node-text)]">
          {data.fieldKey}
        </span>
        <Handle
          id={data.fieldKey}
          type="source"
          position={Position.Right}
          className="!h-3.5 !w-3.5 !border-[3px] !border-theme-elevated !bg-[#007AFF] !shadow-sm transition group-hover:scale-110"
        />
      </div>
    </div>
  )
}
