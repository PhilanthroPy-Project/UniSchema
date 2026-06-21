import {
  ArrowRight,
  CircleDot,
  GripVertical,
  Hash,
  ToggleLeft,
  Type,
} from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'

import { Badge } from '../../ui/badge'
import { Tooltip } from '../../ui/tooltip'
import { cn } from '../../../lib/cn'
import type { VendorNodeData, VendorFieldValueType } from '../../../store/mappingStoreTypes'

export type { VendorNodeData } from '../../../store/mappingStoreTypes'

function ValueTypeIcon({ valueType }: { valueType: VendorFieldValueType }) {
  switch (valueType) {
    case 'number':
      return <Hash className="h-3 w-3" strokeWidth={2} />
    case 'boolean':
      return <ToggleLeft className="h-3 w-3" strokeWidth={2} />
    case 'string':
      return <Type className="h-3 w-3" strokeWidth={2} />
    default:
      return <CircleDot className="h-3 w-3" strokeWidth={2} />
  }
}

function formatSampleValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value, null, 0)

  if (serialized.length <= 36) {
    return serialized
  }

  return `${serialized.slice(0, 33)}…`
}

export function VendorNode({ data, selected }: NodeProps<VendorNodeData>) {
  const samplePreview = formatSampleValue(data.sampleValue)

  return (
    <div
      className={cn(
        'group min-w-[260px] overflow-visible rounded-2xl border bg-[var(--color-node-surface)]/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]',
        selected
          ? 'border-apple-blue-ios ring-2 ring-apple-blue-ios/20'
          : 'border-theme-hairline/80 hover:border-apple-blue-ios/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]',
        data.isConnected && !selected && 'border-apple-green/40',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-theme-hairline/60 bg-[var(--color-node-header)]/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-[var(--color-node-muted)] opacity-60" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-node-muted)]">
            Vendor Field
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="muted" className="gap-1 normal-case tracking-normal">
            <ValueTypeIcon valueType={data.valueType} />
            {data.valueType}
          </Badge>
          {data.isConnected ? (
            <Badge variant="success">Mapped</Badge>
          ) : (
            <Badge variant="outline">Unmapped</Badge>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <Tooltip content="Drag from the sidebar or connect this handle to a Master Schema field.">
            <p className="truncate font-system text-sm font-medium tracking-tight text-[var(--color-node-text)]">
              {data.fieldPath}
            </p>
          </Tooltip>
          <Tooltip content={`Sample value from the latest vendor payload: ${samplePreview}`}>
            <p className="mt-1 truncate font-mono text-[11px] text-theme-muted">{samplePreview}</p>
          </Tooltip>
        </div>

        <Tooltip content="Connect to a Master Schema target field">
          <div className="relative flex shrink-0 items-center">
            <ArrowRight className="mr-1 h-3.5 w-3.5 text-theme-muted opacity-0 transition group-hover:opacity-100" />
            <Handle
              id={data.fieldPath}
              type="source"
              position={Position.Right}
              className={cn(
                '!-right-2 !h-4 !w-4 !translate-x-1/2 !border-[3px] !border-theme-elevated !shadow-md transition group-hover:scale-110',
                data.isConnected ? '!bg-apple-green' : '!bg-apple-blue-ios',
              )}
            />
          </div>
        </Tooltip>
      </div>
    </div>
  )
}
