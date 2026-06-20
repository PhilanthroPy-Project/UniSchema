import { describe, expect, it } from 'vitest'

import { getDb } from '../../src/db/client.js'
import { webhookIngestions } from '../../src/db/schema.js'
import {
  createIngestion,
  getIngestion,
  releaseStaleProcessingIngestions,
  tryClaimIngestion,
} from '../../src/store/ingestionQueue.js'
import { validGiveCampusPayload } from '../fixtures/payloads.js'

describe('ingestion queue claims', () => {
  it('atomically claims a pending ingestion for processing', async () => {
    const ingestion = await createIngestion('givecampus', validGiveCampusPayload)

    const claimed = await tryClaimIngestion(ingestion.id)
    const secondClaim = await tryClaimIngestion(ingestion.id)

    expect(claimed?.status).toBe('processing')
    expect(secondClaim).toBeUndefined()
    expect((await getIngestion(ingestion.id))?.status).toBe('processing')
  })

  it('releases stale processing ingestions back to pending', async () => {
    const staleCreatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    getDb()
      .insert(webhookIngestions)
      .values({
        id: 'stale-processing-1',
        vendor: 'givecampus',
        rawPayloadJson: JSON.stringify(validGiveCampusPayload),
        status: 'processing',
        createdAt: staleCreatedAt,
      })
      .run()

    const released = await releaseStaleProcessingIngestions()

    expect(released).toBe(1)
    expect((await getIngestion('stale-processing-1'))?.status).toBe('pending')
  })
})
