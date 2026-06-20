import { Database, Lock } from 'lucide-react'

import {
  CONSTITUENT_EVENT_FIELDS,
  type ConstituentEventFieldMeta,
} from '../../types/constituentEvent'

type MasterSchemaPanelProps = {
  connectedTargets: Set<string>
}

function RequirementIndicator({
  requirement,
}: {
  requirement: ConstituentEventFieldMeta['requirement']
}) {
  if (requirement === 'required') {
    return (
      <span className="rounded-full bg-apple-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-apple-red">
        Required
      </span>
    )
  }

  if (requirement === 'optional') {
    return (
      <span className="rounded-full bg-theme-inset px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-theme-muted">
        Optional
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-theme-inset px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-theme-muted">
      <Lock className="h-2.5 w-2.5" />
      System
    </span>
  )
}

function SchemaFieldRow({
  field,
  isConnected,
}: {
  field: ConstituentEventFieldMeta
  isConnected: boolean
}) {
  return (
    <li
      className={[
        'rounded-xl px-3 py-2.5 transition-colors',
        isConnected
          ? 'bg-apple-green/10 shadow-sm dark:bg-apple-green/15'
          : 'bg-theme-elevated/50 hover:bg-theme-elevated',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight text-theme-ink">
            {field.key}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-theme-muted">
            {field.description}
          </p>
        </div>
        <RequirementIndicator requirement={field.requirement} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-theme-muted">
        <span className="rounded-md bg-theme-inset px-1.5 py-0.5">{field.valueType}</span>
        <div className="flex items-center gap-2">
          {!field.mappable && (
            <span className="inline-flex items-center gap-1 text-theme-muted/80">
              <Lock className="h-3 w-3" />
              Read-only
            </span>
          )}
          {isConnected && (
            <span className="font-medium text-apple-green">Mapped</span>
          )}
        </div>
      </div>
    </li>
  )
}

export function MasterSchemaPanel({ connectedTargets }: MasterSchemaPanelProps) {
  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl bg-theme-surface shadow-sm backdrop-blur-xl transition-colors duration-300">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-theme-inset">
            <Database className="h-4 w-4 text-theme-muted" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-theme-ink">Master Schema</h2>
            <p className="text-xs text-theme-muted">ConstituentEvent (locked)</p>
          </div>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
        {CONSTITUENT_EVENT_FIELDS.map((field) => (
          <SchemaFieldRow
            key={field.key}
            field={field}
            isConnected={connectedTargets.has(field.key)}
          />
        ))}
      </ul>
    </aside>
  )
}
