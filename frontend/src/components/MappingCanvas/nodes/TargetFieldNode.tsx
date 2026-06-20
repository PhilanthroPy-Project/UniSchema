import { Lock } from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'

import type { ConstituentEventFieldMeta } from '../../../types/constituentEvent'

export type TargetFieldNodeData = {
  field: ConstituentEventFieldMeta
}

function RequirementBadge({
  requirement,
}: {
  requirement: ConstituentEventFieldMeta['requirement']
}) {
  if (requirement === 'required') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-apple-red">
        Required
      </span>
    )
  }

  if (requirement === 'optional') {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-node-muted)]">
        Optional
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-node-muted)]">
      <Lock className="h-2.5 w-2.5" />
      System
    </span>
  )
}

export function TargetFieldNode({ data }: NodeProps<TargetFieldNodeData>) {
  const { field } = data

  return (
    <div className="group min-w-[240px] overflow-hidden rounded-2xl border border-[var(--color-node-border)] bg-[var(--color-node-surface)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-2 border-b border-theme-hairline/50 bg-[var(--color-node-header)] px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-node-muted)]">
          Target
        </span>
        <RequirementBadge requirement={field.requirement} />
      </div>
      <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
        <Handle
          id={field.key}
          type="target"
          position={Position.Left}
          className="!h-3.5 !w-3.5 !border-[3px] !border-theme-elevated !bg-[#34C759] !shadow-sm transition group-hover:scale-110"
        />
        <div className="ml-2 flex min-w-0 flex-1 flex-col">
          <span className="truncate font-system text-sm font-medium tracking-tight text-[var(--color-node-text)]">
            {field.key}
          </span>
          <span className="mt-0.5 truncate text-xs font-medium text-[var(--color-node-muted)]">
            {field.valueType}
          </span>
        </div>
      </div>
    </div>
  )
}
