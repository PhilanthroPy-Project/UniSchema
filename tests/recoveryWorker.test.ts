import { describe, expect, it, vi } from 'vitest'

import { getDb } from '../src/db/client.js'
import { webhookIngestions } from '../src/db/schema.js'
import { recoverPendingEgress, recoverPendingIngestions } from '../src/store/recoveryWorker.js'
import { getIngestion } from '../src/store/ingestionQueue.js'
import { listPendingEgressEvents, persistConstituentEvent } from '../src/store/egressStore.js'
import { validConstituentEvent, validGiveCampusPayload } from './fixtures/payloads.js'

describe('recoverPendingIngestions', () => {
  it('re-processes pending ingestions older than the stale threshold', async () => {
    const staleCreatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    getDb()
      .insert(webhookIngestions)
      .values({
        id: 'stale-ingestion-1',
        vendor: 'givecampus',
        rawPayloadJson: JSON.stringify(validGiveCampusPayload),
        status: 'pending',
        createdAt: staleCreatedAt,
      })
      .run()

    const recovered = await recoverPendingIngestions()

    expect(recovered).toBe(1)

    const ingestion = getIngestion('stale-ingestion-1')
    expect(ingestion?.status).toBe('completed')
    expect(ingestion?.result?.constituentEmail).toBe(validGiveCampusPayload.donor_email)
  })

  it('ignores recent pending ingestions', async () => {
    getDb()
      .insert(webhookIngestions)
      .values({
        id: 'fresh-ingestion-1',
        vendor: 'givecampus',
        rawPayloadJson: JSON.stringify(validGiveCampusPayload),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      .run()

    const recovered = await recoverPendingIngestions()

    expect(recovered).toBe(0)
    expect(getIngestion('fresh-ingestion-1')?.status).toBe('pending')
  })

  it('skips ingestions with unknown vendors', async () => {
    const staleCreatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    getDb()
      .insert(webhookIngestions)
      .values({
        id: 'unknown-vendor-ingestion',
        vendor: 'legacy-vendor',
        rawPayloadJson: JSON.stringify(validGiveCampusPayload),
        status: 'pending',
        createdAt: staleCreatedAt,
      })
      .run()

    const recovered = await recoverPendingIngestions()

    expect(recovered).toBe(0)
    expect(getIngestion('unknown-vendor-ingestion')?.status).toBe('pending')
  })
})

describe('recoverPendingEgress', () => {
  it('publishes staged events that were never pushed to object storage', async () => {
    process.env.EGRESS_TARGET = 'none'

    persistConstituentEvent(
      {
        ...validConstituentEvent,
        eventId: '550e8400-e29b-41d4-a716-446655440099',
      },
      'givecampus',
    )

    expect(listPendingEgressEvents()).toHaveLength(1)

    process.env.EGRESS_TARGET = 'local'
    const published = await recoverPendingEgress()

    expect(published).toBe(1)
    expect(listPendingEgressEvents()).toHaveLength(0)
  })

  it('continues when an individual egress publish fails during recovery', async () => {
    persistConstituentEvent(
      {
        ...validConstituentEvent,
        eventId: '550e8400-e29b-41d4-a716-446655440088',
      },
      'givecampus',
    )

    const publishSpy = vi
      .spyOn(await import('../src/egress/publisher.js'), 'publishEgressEvent')
      .mockRejectedValue(new Error('Simulated recovery publish failure'))

    const published = await recoverPendingEgress()

    expect(published).toBe(0)
    expect(listPendingEgressEvents()).toHaveLength(1)

    publishSpy.mockRestore()
  })
})
