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
      <span className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
        Required
      </span>
    )
  }

  if (requirement === 'optional') {
    return (
      <span className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
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
        'border-b border-gray-200 px-4 py-3 last:border-b-0',
        isConnected ? 'bg-emerald-50/60' : 'bg-white',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-gray-900">{field.key}</p>
          <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>
        </div>
        <RequirementIndicator requirement={field.requirement} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
        <span className="font-mono">{field.valueType}</span>
        {!field.mappable && (
          <span className="inline-flex items-center gap-1 text-gray-400">
            <Lock className="h-3 w-3" />
            Read-only
          </span>
        )}
        {isConnected && (
          <span className="font-medium text-emerald-700">Mapped</span>
        )}
      </div>
    </li>
  )
}

export function MasterSchemaPanel({ connectedTargets }: MasterSchemaPanelProps) {
  return (
    <aside className="flex h-full flex-col border-l-2 border-gray-200 bg-gray-50">
      <div className="border-b-2 border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-700" strokeWidth={2.5} />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Master Schema</h2>
            <p className="text-xs text-gray-500">ConstituentEvent (locked)</p>
          </div>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto border-t border-gray-200">
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
