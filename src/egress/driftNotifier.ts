import { createHmac } from 'node:crypto'

import type { DriftEventRecord } from '../store/driftQueue.js'
import type { EgressConfig } from './config.js'

export type DriftNotifyResult =
  | { notified: true; status: number }
  | { notified: false; reason: 'disabled' }

/**
 * POSTs a schema-drift incident to the configured webhook (PagerDuty/Slack/Jira/
 * generic). Fired once per new drift signature so a burst of identical failures
 * raises a single alert. Point `DRIFT_WEBHOOK_URL` at your incident endpoint.
 *
 * Mirrors the Airflow notifier contract (Bearer secret + HMAC signature) so
 * downstream receivers verify UniSchema alerts the same way they verify batches.
 */
export async function notifyDriftDetected(
  event: DriftEventRecord,
  config: EgressConfig,
): Promise<DriftNotifyResult> {
  if (!config.driftWebhookUrl) {
    return { notified: false, reason: 'disabled' }
  }

  const body = JSON.stringify({
    type: 'schema_drift',
    driftEventId: event.id,
    vendor: event.vendor,
    signature: event.signature,
    mapperKind: event.mapperKind,
    capturedAt: event.capturedAt,
    validationErrors: event.validationErrors,
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.driftWebhookSecret) {
    headers.Authorization = `Bearer ${config.driftWebhookSecret}`
    headers['X-UniSchema-Signature'] = createHmac('sha256', config.driftWebhookSecret)
      .update(body)
      .digest('hex')
  }

  const response = await fetch(config.driftWebhookUrl, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Drift webhook returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    )
  }

  return { notified: true, status: response.status }
}
