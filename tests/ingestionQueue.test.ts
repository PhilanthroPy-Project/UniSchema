import { describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client.js'
import { webhookIngestions } from '../src/db/schema.js'
import {
  createIngestion,
  getIngestion,
  releaseStaleProcessingIngestions,
  tryClaimIngestion,
} from '../src/store/ingestionQueue.js'
import { validGiveCampusPayload } from './fixtures/payloads.js'

describe('ingestion queue claims', () => {
  it('atomically claims a pending ingestion for processing', () => {
    const ingestion = createIngestion('givecampus', validGiveCampusPayload)

    const claimed = tryClaimIngestion(ingestion.id)
    const secondClaim = tryClaimIngestion(ingestion.id)

    expect(claimed?.status).toBe('processing')
    expect(secondClaim).toBeUndefined()
    expect(getIngestion(ingestion.id)?.status).toBe('processing')
  })

  it('releases stale processing ingestions back to pending', () => {
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

    const released = releaseStaleProcessingIngestions()

    expect(released).toBe(1)
    expect(getIngestion('stale-processing-1')?.status).toBe('pending')
  })
})
