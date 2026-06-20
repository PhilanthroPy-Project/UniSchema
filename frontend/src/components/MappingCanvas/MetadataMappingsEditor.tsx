import { Plus, Trash2 } from 'lucide-react'

import type { MetadataMapping } from '../../types/mapping'

type MetadataMappingsEditorProps = {
  mappings: MetadataMapping[]
  sourcePaths: string[]
  onChange: (mappings: MetadataMapping[]) => void
}

export function MetadataMappingsEditor({
  mappings,
  sourcePaths,
  onChange,
}: MetadataMappingsEditorProps) {
  const addRow = () => {
    const firstPath = sourcePaths[0] ?? ''
    onChange([...mappings, { source: firstPath, key: `field_${mappings.length + 1}` }])
  }

  const updateRow = (index: number, patch: Partial<MetadataMapping>) => {
    onChange(
      mappings.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    )
  }

  const removeRow = (index: number) => {
    onChange(mappings.filter((_, rowIndex) => rowIndex !== index))
  }

  return (
    <div className="border-t border-theme-border px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
            Metadata (normalizedMetadata)
          </h3>
          <p className="text-[11px] text-theme-muted">Map source fields to ML feature keys</p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-full bg-theme-inset px-2.5 py-1 text-xs text-theme-ink hover:bg-theme-elevated"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
      {mappings.length === 0 ? (
        <p className="text-xs text-theme-muted">No metadata mappings yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mappings.map((mapping, index) => (
            <li key={`${mapping.key}-${index}`} className="flex items-center gap-2">
              <select
                value={mapping.source}
                onChange={(event) => updateRow(index, { source: event.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-theme-border bg-theme-inset px-2 py-1 text-xs"
              >
                {sourcePaths.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </select>
              <span className="text-theme-muted">→</span>
              <input
                type="text"
                value={mapping.key}
                onChange={(event) => updateRow(index, { key: event.target.value })}
                placeholder="metadata key"
                className="w-28 rounded-lg border border-theme-border bg-theme-inset px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-lg p-1 text-theme-muted hover:bg-theme-elevated hover:text-apple-red"
                aria-label="Remove metadata mapping"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
