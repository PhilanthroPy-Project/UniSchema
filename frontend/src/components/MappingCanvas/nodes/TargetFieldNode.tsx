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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FF3B30]">
        Required
      </span>
    )
  }

  if (requirement === 'optional') {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Optional
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
      <Lock className="h-2.5 w-2.5" />
      System
    </span>
  )
}

export function TargetFieldNode({ data }: NodeProps<TargetFieldNodeData>) {
  const { field } = data

  return (
    <div className="group min-w-[240px] rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200/50 bg-gray-50/30 px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
          Target
        </span>
        <RequirementBadge requirement={field.requirement} />
      </div>
      <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
        <Handle
          id={field.key}
          type="target"
          position={Position.Left}
          className="!h-3.5 !w-3.5 !border-[3px] !border-white !bg-[#34C759] !shadow-sm transition group-hover:scale-110"
        />
        <div className="ml-2 flex min-w-0 flex-1 flex-col">
          <span className="truncate font-system text-sm font-medium text-gray-800 tracking-tight">
            {field.key}
          </span>
          <span className="truncate text-xs text-gray-400 font-medium mt-0.5">
            {field.valueType}
          </span>
        </div>
      </div>
    </div>
  )
}
