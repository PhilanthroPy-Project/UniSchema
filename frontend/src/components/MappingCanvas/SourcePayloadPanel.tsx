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
          'flex items-start gap-2 border-l-2 py-1.5 pl-3 pr-2 font-mono text-xs',
          isHighlighted
            ? 'border-sky-500 bg-sky-50 text-sky-900'
            : 'border-transparent text-gray-700 hover:bg-gray-50',
        ].join(' ')}
        style={{ marginLeft: depth * 12 }}
      >
        <span className="shrink-0 text-gray-500">{node.key}:</span>
        <span className="break-all text-gray-900">{formatPayloadValue(node.value)}</span>
      </div>
    )
  }

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        className="flex w-full items-center gap-1.5 rounded-sm py-1.5 pl-1 pr-2 text-left font-mono text-xs text-gray-800 hover:bg-gray-50"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        )}
        <span className="font-semibold">{node.key}</span>
        <span className="text-gray-400">{`{${node.children.length}}`}</span>
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
    <aside className="flex h-full flex-col border-r-2 border-gray-200 bg-gray-50">
      <div className="border-b-2 border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-gray-700" strokeWidth={2.5} />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Source Payload</h2>
            <p className="text-xs text-gray-500">{vendor} webhook JSON</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
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
