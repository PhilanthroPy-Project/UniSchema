import { X } from 'lucide-react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from 'reactflow'

import { useMappingStore } from '../../../store/useMappingStore'

export function MappingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const removeEdge = useMappingStore((state) => state.removeEdge)
  const readOnly = useMappingStore((state) => state.status === 'deployed')

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 2,
          stroke: selected ? '#34C759' : '#007AFF',
        }}
      />
      {!readOnly && (
        <EdgeLabelRenderer>
          <button
            type="button"
            aria-label="Remove mapping connection"
            className={[
              'nodrag nopan absolute flex h-5 w-5 items-center justify-center rounded-full border border-theme-hairline bg-theme-elevated text-theme-muted shadow-sm transition hover:border-apple-red hover:bg-apple-red/10 hover:text-apple-red',
              selected ? 'opacity-100' : 'opacity-0 hover:opacity-100',
            ].join(' ')}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={() => removeEdge(id)}
          >
            <X className="h-3 w-3" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
