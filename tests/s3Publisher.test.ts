import { describe, expect, it, vi } from 'vitest'

import { publishToS3, resetS3ClientForTests } from '../src/egress/s3Publisher.js'
import { persistConstituentEvent } from '../src/store/egressStore.js'
import { validConstituentEvent } from './fixtures/payloads.js'

const sendMock = vi.fn().mockResolvedValue({})

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock
    constructor(_config: unknown) {}
  }

  class PutObjectCommand {
    constructor(public readonly input: unknown) {}
  }

  return { S3Client, PutObjectCommand }
})

describe('publishToS3', () => {
  it('uploads JSONL objects to the configured bucket', async () => {
    resetS3ClientForTests()
    sendMock.mockClear()

    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const location = await publishToS3(record, {
      target: 's3',
      localDir: 'data/egress',
      s3Bucket: 'analytics-bucket',
      s3Prefix: 'constituent-events',
      s3Region: 'us-east-1',
    })

    expect(location).toBe(
      `s3://analytics-bucket/constituent-events/givecampus/2026/06/20/${validConstituentEvent.eventId}.json`,
    )
    expect(sendMock).toHaveBeenCalledOnce()
  })

  it('throws when the S3 bucket is missing', async () => {
    resetS3ClientForTests()

    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')

    await expect(
      publishToS3(record, {
        target: 's3',
        localDir: 'data/egress',
        s3Prefix: 'constituent-events',
        s3Region: 'us-east-1',
      }),
    ).rejects.toThrow('EGRESS_S3_BUCKET is required when EGRESS_TARGET=s3')
  })
})
