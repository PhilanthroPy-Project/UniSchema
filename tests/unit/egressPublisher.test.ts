import { afterEach, describe, expect, it, vi } from 'vitest'

import { rm } from 'node:fs/promises'

import { publishEgressEvent } from '../../src/egress/publisher.js'
import * as s3Publisher from '../../src/egress/s3Publisher.js'
import { acknowledgeEgressEvents, persistConstituentEvent } from '../../src/store/egressStore.js'
import { validConstituentEvent } from '../fixtures/payloads.js'

describe('publishEgressEvent', () => {
  afterEach(async () => {
    await rm('data/test-egress', { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('writes JSON events to the local egress directory', async () => {
    const record = await persistConstituentEvent(validConstituentEvent, 'givecampus')
    const result = await publishEgressEvent(record)

    expect(result.target).toBe('local')
    expect(result.location).toContain('data/test-egress')
    expect(result.location).toContain(`${validConstituentEvent.eventId}.json`)
  })

  it('treats existing local egress files as idempotent', async () => {
    const { publishToLocalFilesystem } = await import('../../src/egress/localPublisher.js')
    const record = await persistConstituentEvent(validConstituentEvent, 'givecampus')
    const localDir = process.env.EGRESS_LOCAL_DIR ?? 'data/test-egress'

    const first = await publishToLocalFilesystem(record, localDir, '')
    const second = await publishToLocalFilesystem(record, localDir, '')

    expect(second).toBe(first)
  })

  it('delegates to S3 when the egress target is s3', async () => {
    const record = await persistConstituentEvent(validConstituentEvent, 'givecampus')
    const s3Spy = vi
      .spyOn(s3Publisher, 'publishToS3')
      .mockResolvedValue('s3://analytics-bucket/constituent-events/batches/batch.ndjson')

    const result = await publishEgressEvent(record, {
      target: 's3',
      localDir: 'data/test-egress',
      s3Bucket: 'analytics-bucket',
      s3Prefix: 'constituent-events',
      s3Region: 'us-east-1',
      s3BatchMaxBytes: 5 * 1024 * 1024,
      s3FlushIntervalMs: 120_000,
    })

    expect(result).toEqual({
      target: 's3',
      location: 's3://analytics-bucket/constituent-events/batches/batch.ndjson',
    })
    expect(s3Spy).toHaveBeenCalledOnce()
  })

  it('throws when egress publishing is disabled', async () => {
    const record = await persistConstituentEvent(validConstituentEvent, 'givecampus')

    await expect(
      publishEgressEvent(record, {
        target: 'none',
        localDir: 'data/test-egress',
        s3Prefix: 'constituent-events',
        s3Region: 'us-east-1',
        s3BatchMaxBytes: 5 * 1024 * 1024,
        s3FlushIntervalMs: 120_000,
      }),
    ).rejects.toThrow('Egress publishing is disabled')
  })

  it('returns the existing staging row when the same eventId is persisted again', async () => {
    const first = await persistConstituentEvent(validConstituentEvent, 'givecampus')
    const second = await persistConstituentEvent(validConstituentEvent, 'givecampus')

    expect(second.id).toBe(first.id)
    expect(second.eventId).toBe(first.eventId)
  })

  it('handles concurrent inserts for the same eventId without throwing', async () => {
    const results = await Promise.all([
      persistConstituentEvent(validConstituentEvent, 'givecampus'),
      persistConstituentEvent(validConstituentEvent, 'givecampus'),
    ])

    expect(results[0]?.eventId).toBe(validConstituentEvent.eventId)
    expect(results[1]?.eventId).toBe(validConstituentEvent.eventId)
    expect(new Set(results.map((record) => record.id)).size).toBe(1)
  })
})

describe('acknowledgeEgressEvents', () => {
  it('returns zero when no ids are provided', async () => {
    await expect(acknowledgeEgressEvents([])).resolves.toBe(0)
  })
})
