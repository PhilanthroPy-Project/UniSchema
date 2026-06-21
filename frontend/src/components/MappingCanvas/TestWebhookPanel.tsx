import { useCallback, useState } from 'react'
import { Loader2, Send } from 'lucide-react'

import { buildAuthHeaders } from '../../utils/syncToken'

type TestWebhookPanelProps = {
  vendorSlug: string
  payload: Record<string, unknown>
}

type IngestionResult = {
  status: string
  result?: {
    eventId?: string
    constituentEmail?: string
    eventType?: string
    amount?: number
  }
  error?: { message?: string }
}

export function TestWebhookPanel({ vendorSlug, payload }: TestWebhookPanelProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<'success' | 'error'>('success')

  const handleSendTest = useCallback(async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/webhooks/${vendorSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })

      const body = (await response.json()) as { ingestionId?: string; message?: string }

      if (!response.ok || !body.ingestionId) {
        setTone('error')
        setMessage(body.message ?? `Webhook failed (${response.status})`)
        return
      }

      const deadline = Date.now() + 15_000
      let ingestion: IngestionResult | null = null

      while (Date.now() < deadline) {
        const poll = await fetch(`/api/webhooks/ingestions/${body.ingestionId}`, {
          headers: buildAuthHeaders(),
        })

        if (poll.ok) {
          const pollBody = (await poll.json()) as { ingestion: IngestionResult }
          ingestion = pollBody.ingestion

          if (ingestion.status === 'completed' || ingestion.status === 'failed') {
            break
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      if (!ingestion) {
        setTone('error')
        setMessage('Timed out waiting for ingestion status')
        return
      }

      if (ingestion.status === 'completed') {
        setTone('success')
        setMessage(
          `Completed — ${ingestion.result?.constituentEmail ?? 'unknown'} · ${ingestion.result?.eventType ?? ''} · eventId ${ingestion.result?.eventId ?? ''}`,
        )
        return
      }

      setTone('error')
      setMessage(ingestion.error?.message ?? `Ingestion ${ingestion.status}`)
    } catch (error) {
      setTone('error')
      setMessage(error instanceof Error ? error.message : 'Test webhook failed')
    } finally {
      setLoading(false)
    }
  }, [payload, vendorSlug])

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-theme-ink">Test webhook</p>
          <p className="text-xs text-theme-muted">POST sample payload and poll ingestion</p>
        </div>
        <button
          type="button"
          data-testid="test-webhook-button"
          disabled={loading}
          onClick={() => void handleSendTest()}
          className="inline-flex items-center gap-1.5 rounded-full bg-theme-surface px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-theme-elevated disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send test
        </button>
      </div>
      {message && (
        <p
          className={[
            'mt-2 text-xs',
            tone === 'success' ? 'text-apple-green' : 'text-apple-red',
          ].join(' ')}
        >
          {message}
        </p>
      )}
    </div>
  )
}
