import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FileJson, Upload } from 'lucide-react'

import {
  buildPayloadTree,
  formatPayloadValue,
  type PayloadTreeNode,
} from '../../utils/payloadTree'
import { parsePayloadJson } from '../../utils/importMapping'

type SourcePayloadPanelProps = {
  vendor: string
  payload: Record<string, unknown>
  highlightedPath?: string | null
  onPayloadChange?: (payload: Record<string, unknown>) => void
}

function TreeRow({
  node,
  depth,
  expandedPaths,
  onToggle,
  highlightedPath,
}: {
  node: PayloadTreeNode
  depth: number
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  highlightedPath?: string | null
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isHighlighted = highlightedPath === node.path

  if (node.isLeaf) {
    return (
      <div
        className={[
          'flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
          isHighlighted
            ? 'bg-apple-blue-ios/10 text-apple-blue-ios shadow-sm'
            : 'text-theme-ink/80 hover:bg-theme-elevated',
        ].join(' ')}
        style={{ marginLeft: depth * 12 }}
      >
        <span className="shrink-0 text-theme-muted">{node.key}:</span>
        <span className="break-all font-medium text-theme-ink">
          {formatPayloadValue(node.value)}
        </span>
      </div>
    )
  }

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-xs text-theme-ink transition-colors hover:bg-theme-elevated"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-theme-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-theme-muted" />
        )}
        <span className="font-semibold">{node.key}</span>
        <span className="text-theme-muted">{`{${node.children.length}}`}</span>
      </button>
      {isExpanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedPaths={expandedPaths}
            onToggle={onToggle}
            highlightedPath={highlightedPath}
          />
        ))}
    </div>
  )
}

export function SourcePayloadPanel({
  vendor,
  payload,
  highlightedPath,
  onPayloadChange,
}: SourcePayloadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  const tree = useMemo(() => buildPayloadTree(payload), [payload])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(tree.map((node) => node.path)),
  )

  const togglePath = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const applyPayload = (raw: string) => {
    const result = parsePayloadJson(raw)
    if (!result.success) {
      setPasteError(result.message)
      return
    }
    setPasteError(null)
    onPayloadChange?.(result.payload)
    setPasteOpen(false)
    setPasteText('')
  }

  const handleFileUpload = async (file: File) => {
    const text = await file.text()
    applyPayload(text)
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/60">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-theme-inset">
              <FileJson className="h-4 w-4 text-theme-muted" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-theme-ink">Source Payload</h2>
              <p className="text-xs text-theme-muted">{vendor} webhook JSON</p>
            </div>
          </div>
          {onPayloadChange && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPasteOpen((open) => !open)}
                className="rounded-full bg-theme-inset px-2.5 py-1 text-[11px] text-theme-ink hover:bg-theme-elevated"
              >
                Paste
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-full bg-theme-inset px-2.5 py-1 text-[11px] text-theme-ink hover:bg-theme-elevated"
              >
                <Upload className="h-3 w-3" />
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleFileUpload(file)
                  }
                  event.target.value = ''
                }}
              />
            </div>
          )}
        </div>
        {pasteOpen && (
          <div className="mt-3 space-y-2">
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              rows={4}
              placeholder='{"id": "...", ...}'
              className="w-full rounded-xl border border-theme-border bg-theme-inset p-2 text-xs font-mono"
            />
            {pasteError && <p className="text-xs text-apple-red">{pasteError}</p>}
            <button
              type="button"
              onClick={() => applyPayload(pasteText)}
              className="rounded-full bg-apple-blue-focus px-3 py-1 text-xs text-white"
            >
              Apply payload
            </button>
          </div>
        )}
      </div>
      <div className="mx-3 mb-3 flex-1 overflow-y-auto rounded-xl bg-theme-inset p-2">
        {tree.map((node) => (
          <TreeRow
            key={node.path}
            node={node}
            depth={0}
            expandedPaths={expandedPaths}
            onToggle={togglePath}
            highlightedPath={highlightedPath}
          />
        ))}
      </div>
    </aside>
  )
}
