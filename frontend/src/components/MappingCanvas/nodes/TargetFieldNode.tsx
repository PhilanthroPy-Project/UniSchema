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
      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-500">
        Required
      </span>
    )
  }

  if (requirement === 'optional') {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wider text-theme-muted opacity-70">
        Optional
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-theme-muted opacity-70">
      <Lock className="h-2.5 w-2.5" />
      System
    </span>
  )
}

export function TargetFieldNode({ data }: NodeProps<TargetFieldNodeData>) {
  const { field } = data
  const isOptional = field.requirement === 'optional'

  return (
    <div className="group min-w-[260px] overflow-visible rounded-2xl border border-theme-hairline/80 bg-[var(--color-node-surface)]/80 px-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-2 border-b border-theme-hairline/60 bg-[var(--color-node-header)]/70 px-5 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-node-muted)]">
          Target
        </span>
        <RequirementBadge requirement={field.requirement} />
      </div>
      <div className="relative flex items-center justify-between gap-3 px-5 py-4">
        <Handle
          id={field.key}
          type="target"
          position={Position.Left}
          className="!-left-2 !h-4 !w-4 !-translate-x-1/2 !border-[3px] !border-theme-elevated !bg-[#34C759] !shadow-md transition group-hover:scale-110"
        />
        <div className="ml-2 flex min-w-0 flex-1 flex-col">
          <span
            className={[
              'truncate font-system text-sm font-medium tracking-tight',
              isOptional ? 'text-theme-muted opacity-75' : 'text-[var(--color-node-text)]',
            ].join(' ')}
          >
            {field.key}
          </span>
          <span
            className={[
              'mt-0.5 truncate text-xs font-medium',
              isOptional ? 'text-theme-muted opacity-60' : 'text-[var(--color-node-muted)]',
            ].join(' ')}
          >
            {field.valueType}
          </span>
        </div>
      </div>
    </div>
  )
}
