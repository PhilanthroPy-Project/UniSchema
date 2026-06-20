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
      <span className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
        Required
      </span>
    )
  }

  if (requirement === 'optional') {
    return (
      <span className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
        Optional
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
      <Lock className="h-2.5 w-2.5" />
      System
    </span>
  )
}

export function TargetFieldNode({ data }: NodeProps<TargetFieldNodeData>) {
  const { field } = data

  return (
    <div className="group min-w-[240px] rounded-md border-2 border-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          Target
        </span>
        <RequirementBadge requirement={field.requirement} />
      </div>
      <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
        <Handle
          id={field.key}
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-gray-900 !bg-emerald-500 transition group-hover:!bg-emerald-400"
        />
        <div className="ml-2 flex min-w-0 flex-1 flex-col">
          <span className="truncate font-mono text-sm font-medium text-gray-900">
            {field.key}
          </span>
          <span className="truncate text-xs text-gray-500">{field.valueType}</span>
        </div>
      </div>
    </div>
  )
}
