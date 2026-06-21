import { CheckCircle2, CircleAlert, Lock, Target } from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'

import { Badge } from '../../ui/badge'
import { Tooltip } from '../../ui/tooltip'
import { cn } from '../../../lib/cn'
import type { ConstituentEventFieldMeta } from '../../../types/constituentEvent'
import type { MasterSchemaNodeData } from '../../../store/mappingStoreTypes'

export type { MasterSchemaNodeData } from '../../../store/mappingStoreTypes'

function RequirementBadge({
  requirement,
}: {
  requirement: ConstituentEventFieldMeta['requirement']
}) {
  if (requirement === 'required') {
    return <Badge variant="destructive">Required</Badge>
  }

  if (requirement === 'optional') {
    return <Badge variant="muted">Optional</Badge>
  }

  return (
    <Badge variant="outline" className="gap-1">
      <Lock className="h-2.5 w-2.5" />
      System
    </Badge>
  )
}

function ConnectionStatusBadge({
  isConnected,
  isValid,
  requirement,
}: {
  isConnected: boolean
  isValid: boolean
  requirement: ConstituentEventFieldMeta['requirement']
}) {
  if (requirement !== 'required' && requirement !== 'optional') {
    return null
  }

  if (isConnected && isValid) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Connected
      </Badge>
    )
  }

  if (requirement === 'required' && !isConnected) {
    return (
      <Badge variant="destructive" className="gap-1">
        <CircleAlert className="h-2.5 w-2.5" />
        Missing
      </Badge>
    )
  }

  return <Badge variant="outline">Awaiting</Badge>
}

export function MasterSchemaNode({ data, selected }: NodeProps<MasterSchemaNodeData>) {
  const { field } = data
  const isOptional = field.requirement === 'optional'
  const isMappable = field.mappable

  return (
    <div
      className={cn(
        'group min-w-[280px] overflow-visible rounded-2xl border bg-[var(--color-node-surface)]/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]',
        selected
          ? 'border-apple-green ring-2 ring-apple-green/20'
          : 'border-theme-hairline/80 hover:border-apple-green/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]',
        !data.isValid && field.requirement === 'required' && 'border-apple-red/50',
        data.isConnected && data.isValid && !selected && 'border-apple-green/40',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-theme-hairline/60 bg-[var(--color-node-header)]/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-apple-green" strokeWidth={2} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-node-muted)]">
            Master Schema
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <RequirementBadge requirement={field.requirement} />
          <ConnectionStatusBadge
            isConnected={data.isConnected}
            isValid={data.isValid}
            requirement={field.requirement}
          />
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
        {isMappable ? (
          <Tooltip content="Drop a vendor field connection here. Each target accepts one mapping.">
            <Handle
              id={field.key}
              type="target"
              position={Position.Left}
              className={cn(
                '!-left-2 !h-4 !w-4 !-translate-x-1/2 !border-[3px] !border-theme-elevated !shadow-md transition group-hover:scale-110',
                data.isConnected ? '!bg-apple-green' : '!bg-apple-blue-ios',
              )}
            />
          </Tooltip>
        ) : (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-theme-inset">
            <Lock className="h-2.5 w-2.5 text-theme-muted" />
          </span>
        )}

        <div className="ml-2 flex min-w-0 flex-1 flex-col">
          <Tooltip content={field.description}>
            <span
              className={cn(
                'truncate font-system text-sm font-medium tracking-tight',
                isOptional ? 'text-theme-muted opacity-80' : 'text-[var(--color-node-text)]',
              )}
            >
              {field.label}
            </span>
          </Tooltip>
          <div className="mt-1 flex items-center gap-2">
            <span className="truncate font-mono text-[11px] text-theme-muted">{field.key}</span>
            <Badge variant="outline" className="normal-case tracking-normal">
              {field.valueType}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
