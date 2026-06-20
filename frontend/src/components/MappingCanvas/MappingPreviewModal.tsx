import { Loader2, Play, X } from 'lucide-react'

type MappingPreviewModalProps = {
  open: boolean
  loading: boolean
  result: Record<string, unknown> | null
  error: string | null
  onClose: () => void
}

export function MappingPreviewModal({
  open,
  loading,
  result,
  error,
  onClose,
}: MappingPreviewModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-theme-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Play className="h-4 w-4 text-apple-blue-focus" />
            Test mapping preview
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-theme-inset">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-theme-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running preview…
            </div>
          ) : error ? (
            <p className="text-sm text-apple-red">{error}</p>
          ) : result ? (
            <pre className="whitespace-pre-wrap break-all rounded-xl bg-theme-inset p-3 text-xs font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}
