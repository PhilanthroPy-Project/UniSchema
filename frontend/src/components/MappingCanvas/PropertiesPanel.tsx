import { ArrowLeft, Plus, Trash2, Wand2 } from 'lucide-react'

import { Badge } from '../ui/badge'
import { Tooltip } from '../ui/tooltip'
import {
  TRANSFORMATION_FUNCTIONS,
  type TransformationFunction,
  type TransformationStep,
} from '../../store/mappingStoreTypes'
import {
  MASTER_SCHEMA_NODE_TYPE,
  VENDOR_NODE_TYPE,
  useMappingStore,
} from '../../store/useMappingStore'
import { formatPayloadValue } from '../../utils/payloadTree'

const TRANSFORMATION_LABELS: Record<TransformationFunction, string> = {
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
  trim: 'Trim whitespace',
  parseDate: 'Parse date',
  extractDomain: 'Extract email domain',
  parseNumber: 'Parse number',
}

const TRANSFORMATION_HINTS: Record<TransformationFunction, string> = {
  uppercase: 'Converts the source string to UPPERCASE before mapping.',
  lowercase: 'Converts the source string to lowercase before mapping.',
  trim: 'Removes leading and trailing whitespace.',
  parseDate: 'Parses a date string into ISO-8601 format.',
  extractDomain: 'Extracts the domain portion from an email address.',
  parseNumber: 'Parses a locale-formatted number into a float.',
}

function createTransformationStep(fn: TransformationFunction): TransformationStep {
  return {
    id: `transform-${crypto.randomUUID()}`,
    function: fn,
  }
}

type PropertiesPanelProps = {
  onBack: () => void
}

export function PropertiesPanel({ onBack }: PropertiesPanelProps) {
  const selection = useMappingStore((state) => state.selection)
  const nodes = useMappingStore((state) => state.nodes)
  const edges = useMappingStore((state) => state.edges)
  const updateEdgeMapping = useMappingStore((state) => state.updateEdgeMapping)

  if (!selection) {
    return null
  }

  if (selection.kind === 'edge') {
    const edge = edges.find((entry) => entry.id === selection.edgeId)

    if (!edge) {
      return null
    }

    const sourcePath = edge.data?.sourcePath ?? edge.sourceHandle ?? '—'
    const targetField = edge.data?.targetField ?? edge.targetHandle ?? '—'
    const transformations = edge.data?.transformations ?? []

    const addTransformation = (fn: TransformationFunction) => {
      updateEdgeMapping(edge.id, [...transformations, createTransformationStep(fn)])
    }

    const removeTransformation = (stepId: string) => {
      updateEdgeMapping(
        edge.id,
        transformations.filter((step) => step.id !== stepId),
      )
    }

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <header className="border-b border-theme-hairline px-4 py-4">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-theme-muted transition hover:text-theme-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Master Schema
          </button>
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-apple-blue-ios" />
            <h2 className="text-sm font-semibold text-theme-ink">Mapping Properties</h2>
          </div>
          <p className="mt-1 text-xs text-theme-muted">
            Apply transformation functions to this connection
          </p>
        </header>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-xl border border-theme-hairline bg-theme-inset/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              Connection
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Badge variant="default" className="max-w-[120px] truncate normal-case">
                {sourcePath}
              </Badge>
              <span className="text-theme-muted">→</span>
              <Badge variant="success" className="normal-case">
                {targetField}
              </Badge>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-theme-ink">Transformations</p>
              <Badge variant="muted">{transformations.length} step(s)</Badge>
            </div>

            {transformations.length === 0 ? (
              <p className="rounded-xl bg-theme-inset/60 px-3 py-2.5 text-xs text-theme-muted">
                No transformations — the raw vendor value will be mapped directly.
              </p>
            ) : (
              <ul className="space-y-2">
                {transformations.map((step, index) => (
                  <li
                    key={step.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-theme-hairline bg-theme-elevated/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-theme-ink">
                        {index + 1}. {TRANSFORMATION_LABELS[step.function]}
                      </p>
                      <p className="mt-0.5 text-[11px] text-theme-muted">
                        {TRANSFORMATION_HINTS[step.function]}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${step.function} transformation`}
                      onClick={() => removeTransformation(step.id)}
                      className="shrink-0 rounded-lg p-1.5 text-theme-muted transition hover:bg-apple-red/10 hover:text-apple-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-theme-ink">Add transformation</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TRANSFORMATION_FUNCTIONS.map((fn) => (
                <Tooltip key={fn} content={TRANSFORMATION_HINTS[fn]}>
                  <button
                    type="button"
                    onClick={() => addTransformation(fn)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-theme-hairline bg-theme-elevated/50 px-2 py-2 text-[11px] font-medium text-theme-ink transition hover:border-apple-blue-ios/40 hover:bg-apple-blue-ios/5"
                  >
                    <Plus className="h-3 w-3" />
                    {TRANSFORMATION_LABELS[fn]}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const node = nodes.find((entry) => entry.id === selection.nodeId)

  if (!node) {
    return null
  }

  if (node.type === VENDOR_NODE_TYPE) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <header className="border-b border-theme-hairline px-4 py-4">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-theme-muted transition hover:text-theme-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Master Schema
          </button>
          <h2 className="text-sm font-semibold text-theme-ink">Vendor Field</h2>
          <p className="mt-1 font-mono text-xs text-theme-muted">{node.data.fieldPath}</p>
        </header>
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <div className="rounded-xl border border-theme-hairline bg-theme-inset/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              Sample value
            </p>
            <p className="mt-1 break-all font-mono text-xs text-theme-ink">
              {formatPayloadValue(node.data.sampleValue)}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="muted">{node.data.valueType}</Badge>
            <Badge variant={node.data.isConnected ? 'success' : 'outline'}>
              {node.data.isConnected ? 'Mapped' : 'Unmapped'}
            </Badge>
          </div>
        </div>
      </div>
    )
  }

  if (node.type === MASTER_SCHEMA_NODE_TYPE) {
    const { field } = node.data

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <header className="border-b border-theme-hairline px-4 py-4">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-theme-muted transition hover:text-theme-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Master Schema
          </button>
          <h2 className="text-sm font-semibold text-theme-ink">{field.label}</h2>
          <p className="mt-1 font-mono text-xs text-theme-muted">{field.key}</p>
        </header>
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <p className="text-xs leading-relaxed text-theme-muted">{field.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{field.valueType}</Badge>
            <Badge
              variant={
                field.requirement === 'required'
                  ? 'destructive'
                  : field.requirement === 'optional'
                    ? 'muted'
                    : 'outline'
              }
            >
              {field.requirement}
            </Badge>
            <Badge variant={node.data.isConnected ? 'success' : 'outline'}>
              {node.data.isConnected ? 'Connected' : 'Not connected'}
            </Badge>
          </div>
        </div>
      </div>
    )
  }

  return null
}
