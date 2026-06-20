import { describe, expect, it } from 'vitest'

import {
  buildEgressBatchManifest,
  buildManifestObjectKey,
} from '../../src/egress/batchManifest.js'
import { persistConstituentEvent } from '../../src/store/egressStore.js'
import { validConstituentEvent } from '../fixtures/payloads.js'

describe('buildEgressBatchManifest', () => {
  it('builds an Airflow-ready manifest for a flushed batch', async () => {
    const record = await persistConstituentEvent(validConstituentEvent, 'givecampus')
    const objectKey = 'constituent-events/batches/2026/06/20/batch-123.ndjson'

    const manifest = buildEgressBatchManifest([record], 'analytics-bucket', objectKey, 2048, 'batch-123')

    expect(manifest).toEqual({
      event: 'egress.batch.ready',
      batchId: 'batch-123',
      s3Uri: 's3://analytics-bucket/constituent-events/batches/2026/06/20/batch-123.ndjson',
      manifestUri:
        's3://analytics-bucket/constituent-events/batches/2026/06/20/batch-123.manifest.json',
      objectKey,
      bucket: 'analytics-bucket',
      recordCount: 1,
      byteSize: 2048,
      vendors: ['givecampus'],
      uploadedAt: expect.any(String),
      format: 'ndjson',
    })
    expect(buildManifestObjectKey(objectKey)).toBe(
      'constituent-events/batches/2026/06/20/batch-123.manifest.json',
    )
  })
})
