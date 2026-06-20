import { rm } from 'node:fs/promises'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { publishEgressEvent } from '../src/egress/publisher.js'
import * as s3Publisher from '../src/egress/s3Publisher.js'
import { persistConstituentEvent } from '../src/store/egressStore.js'
import { validConstituentEvent } from './fixtures/payloads.js'

describe('publishEgressEvent', () => {
  afterEach(async () => {
    await rm('data/test-egress', { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('writes JSON events to the local egress directory', async () => {
    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const result = await publishEgressEvent(record)

    expect(result.target).toBe('local')
    expect(result.location).toContain('data/test-egress')
    expect(result.location).toContain(`${validConstituentEvent.eventId}.json`)
  })

  it('delegates to S3 when the egress target is s3', async () => {
    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const s3Spy = vi
      .spyOn(s3Publisher, 'publishToS3')
      .mockResolvedValue('s3://analytics-bucket/constituent-events/event.json')

    const result = await publishEgressEvent(record, {
      target: 's3',
      localDir: 'data/test-egress',
      s3Bucket: 'analytics-bucket',
      s3Prefix: 'constituent-events',
      s3Region: 'us-east-1',
    })

    expect(result).toEqual({
      target: 's3',
      location: 's3://analytics-bucket/constituent-events/event.json',
    })
    expect(s3Spy).toHaveBeenCalledOnce()
  })

  it('throws when egress publishing is disabled', async () => {
    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')

    await expect(
      publishEgressEvent(record, {
        target: 'none',
        localDir: 'data/test-egress',
        s3Prefix: 'constituent-events',
        s3Region: 'us-east-1',
      }),
    ).rejects.toThrow('Egress publishing is disabled')
  })
})
