import { ChevronDown, ChevronRight, FileJson } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  buildPayloadTree,
  formatPayloadValue,
  type PayloadTreeNode,
} from '../../utils/payloadTree'

type SourcePayloadPanelProps = {
  vendor: string
  payload: Record<string, unknown>
  highlightedPath?: string | null
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
            : 'text-apple-ink/80 hover:bg-white/70',
        ].join(' ')}
        style={{ marginLeft: depth * 12 }}
      >
        <span className="shrink-0 text-apple-muted">{node.key}:</span>
        <span className="break-all font-medium text-apple-ink">
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
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-xs text-apple-ink transition-colors hover:bg-white/70"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-apple-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-apple-muted" />
        )}
        <span className="font-semibold">{node.key}</span>
        <span className="text-apple-muted">{`{${node.children.length}}`}</span>
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
}: SourcePayloadPanelProps) {
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

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-xl">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F5F7]">
            <FileJson className="h-4 w-4 text-apple-muted" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-apple-ink">Source Payload</h2>
            <p className="text-xs text-apple-muted">{vendor} webhook JSON</p>
          </div>
        </div>
      </div>
      <div className="mx-3 mb-3 flex-1 overflow-y-auto rounded-xl bg-[#F5F5F7]/60 p-2">
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
