import { createHmac } from 'node:crypto'

import type { EgressBatchManifest } from './batchManifest.js'
import type { EgressConfig } from './config.js'

export type AirflowNotifyResult =
  | { notified: true; status: number }
  | { notified: false; reason: 'disabled' | 'skipped' }

/**
 * POSTs a batch-ready payload to the configured Airflow webhook.
 *
 * Point `AIRFLOW_WEBHOOK_URL` at an Airflow REST DAG-run endpoint, e.g.:
 *   https://airflow.example.com/api/v1/dags/unischema_ingest/dagRuns
 *
 * The JSON body is suitable for Airflow `conf` passthrough into your warehouse DAG.
 */
export async function notifyAirflowBatchReady(
  manifest: EgressBatchManifest,
  config: EgressConfig,
): Promise<AirflowNotifyResult> {
  if (!config.airflowWebhookUrl) {
    return { notified: false, reason: 'disabled' }
  }

  const body = JSON.stringify({
    conf: manifest,
    ...manifest,
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.airflowWebhookSecret) {
    headers.Authorization = `Bearer ${config.airflowWebhookSecret}`
    headers['X-UniSchema-Signature'] = createHmac('sha256', config.airflowWebhookSecret)
      .update(body)
      .digest('hex')
  }

  const response = await fetch(config.airflowWebhookUrl, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Airflow webhook returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    )
  }

  return { notified: true, status: response.status }
}
