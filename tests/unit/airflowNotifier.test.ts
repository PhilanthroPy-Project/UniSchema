import { afterEach, describe, expect, it, vi } from 'vitest'

import { notifyAirflowBatchReady } from '../../src/egress/airflowNotifier.js'
import { buildEgressBatchManifest } from '../../src/egress/batchManifest.js'
import { persistConstituentEvent } from '../../src/store/egressStore.js'
import { validConstituentEvent } from '../fixtures/payloads.js'

const baseConfig = {
  target: 's3' as const,
  localDir: 'data/egress',
  s3Prefix: 'constituent-events',
  s3Region: 'us-east-1',
  s3BatchMaxBytes: 5 * 1024 * 1024,
  s3FlushIntervalMs: 120_000,
}

async function buildManifest() {
  const record = await persistConstituentEvent(validConstituentEvent, 'givecampus')

  return buildEgressBatchManifest(
    [record],
    'analytics-bucket',
    'constituent-events/batches/2026/06/20/batch-123.ndjson',
    1024,
    'batch-123',
  )
}

describe('notifyAirflowBatchReady', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips notification when no webhook URL is configured', async () => {
    const result = await notifyAirflowBatchReady(await buildManifest(), baseConfig)

    expect(result).toEqual({ notified: false, reason: 'disabled' })
  })

  it('POSTs the manifest to the configured Airflow webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 })
    vi.stubGlobal('fetch', fetchMock)

    const manifest = await buildManifest()
    const result = await notifyAirflowBatchReady(manifest, {
      ...baseConfig,
      airflowWebhookUrl: 'https://airflow.example.com/api/v1/dags/unischema_ingest/dagRuns',
      airflowWebhookSecret: 'shared-secret',
    })

    expect(result).toEqual({ notified: true, status: 201 })
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://airflow.example.com/api/v1/dags/unischema_ingest/dagRuns')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer shared-secret',
      'Content-Type': 'application/json',
    })

    const body = JSON.parse(String(init.body))
    expect(body.event).toBe('egress.batch.ready')
    expect(body.conf.s3Uri).toBe(manifest.s3Uri)
  })

  it('notifies without a shared secret when one is not configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await notifyAirflowBatchReady(await buildManifest(), {
      ...baseConfig,
      airflowWebhookUrl: 'https://airflow.example.com/hook',
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('throws when the Airflow webhook returns a non-success status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'service unavailable',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      notifyAirflowBatchReady(await buildManifest(), {
        ...baseConfig,
        airflowWebhookUrl: 'https://airflow.example.com/hook',
      }),
    ).rejects.toThrow('Airflow webhook returned 503: service unavailable')
  })
})
