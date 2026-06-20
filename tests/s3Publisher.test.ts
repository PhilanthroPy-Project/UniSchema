import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  estimateRecordByteSize,
  flushS3Buffer,
  publishToS3,
  resetS3ClientForTests,
} from '../src/egress/s3Publisher.js'
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

const s3Config = {
  target: 's3' as const,
  localDir: 'data/egress',
  s3Bucket: 'analytics-bucket',
  s3Prefix: 'constituent-events',
  s3Region: 'us-east-1',
  s3BatchMaxBytes: 10_000,
  s3FlushIntervalMs: 120_000,
  airflowWebhookUrl: 'https://airflow.example.com/api/v1/dags/unischema_ingest/dagRuns',
  airflowWebhookSecret: 'airflow-shared-secret',
}

describe('publishToS3', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetS3ClientForTests()
    sendMock.mockReset()
    sendMock.mockResolvedValue({})
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    resetS3ClientForTests()
    vi.unstubAllGlobals()
  })

  it('buffers events until the byte threshold is reached', async () => {
    sendMock.mockClear()
    fetchMock.mockClear()

    const firstRecord = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const secondRecord = persistConstituentEvent(
      {
        ...validConstituentEvent,
        eventId: '660e8400-e29b-41d4-a716-446655440001',
      },
      'givecampus',
    )

    const firstByteSize = estimateRecordByteSize(firstRecord)
    const secondByteSize = estimateRecordByteSize(secondRecord)
    const flushThreshold = firstByteSize + secondByteSize

    const config = { ...s3Config, s3BatchMaxBytes: flushThreshold }

    const firstPromise = publishToS3(firstRecord, config)
    expect(sendMock).not.toHaveBeenCalled()

    const secondPromise = publishToS3(secondRecord, config)
    const [firstLocation, secondLocation] = await Promise.all([firstPromise, secondPromise])

    expect(firstLocation).toBe(secondLocation)
    expect(firstLocation).toMatch(
      /^s3:\/\/analytics-bucket\/constituent-events\/batches\/2026\/06\/20\/[0-9a-f-]+\.ndjson$/,
    )
    expect(sendMock).toHaveBeenCalledTimes(2)

    const ndjsonCommand = sendMock.mock.calls[0][0] as {
      input: { Body: string; ContentType: string; Key: string }
    }
    const manifestCommand = sendMock.mock.calls[1][0] as {
      input: { Body: string; ContentType: string; Key: string }
    }

    const lines = ndjsonCommand.input.Body.trim().split('\n')

    expect(ndjsonCommand.input.ContentType).toBe('application/x-ndjson')
    expect(lines).toHaveLength(2)
    expect(manifestCommand.input.Key).toBe(`${ndjsonCommand.input.Key.replace(/\.ndjson$/, '.manifest.json')}`)
    expect(JSON.parse(manifestCommand.input.Body).event).toBe('egress.batch.ready')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('flushes buffered events on demand', async () => {
    sendMock.mockClear()

    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const config = { ...s3Config, s3BatchMaxBytes: 5 * 1024 * 1024 }
    const locationPromise = publishToS3(record, config)

    await flushS3Buffer(config)

    const location = await locationPromise

    expect(location).toMatch(/^s3:\/\/analytics-bucket\/constituent-events\/batches\//)
    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  it('throws when the S3 bucket is missing', async () => {

    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')

    await expect(
      publishToS3(record, {
        target: 's3',
        localDir: 'data/egress',
        s3Prefix: 'constituent-events',
        s3Region: 'us-east-1',
        s3BatchMaxBytes: 5 * 1024 * 1024,
        s3FlushIntervalMs: 120_000,
      }),
    ).rejects.toThrow('EGRESS_S3_BUCKET is required when EGRESS_TARGET=s3')
  })

  it('continues uploading when the Airflow webhook fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Airflow unavailable'))

    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const config = { ...s3Config, s3BatchMaxBytes: estimateRecordByteSize(record) }

    const location = await publishToS3(record, config)

    expect(location).toMatch(/^s3:\/\/analytics-bucket\/constituent-events\/batches\//)
    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('rejects buffered records when the S3 upload fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('S3 unavailable'))

    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const config = { ...s3Config, s3BatchMaxBytes: estimateRecordByteSize(record) }

    await expect(publishToS3(record, config)).rejects.toThrow('S3 unavailable')
  })

  it('flushes on the idle timer when the byte threshold is not reached', async () => {
    vi.useFakeTimers()
    sendMock.mockClear()

    const record = persistConstituentEvent(validConstituentEvent, 'givecampus')
    const config = { ...s3Config, s3BatchMaxBytes: 5 * 1024 * 1024, s3FlushIntervalMs: 1_000 }
    const locationPromise = publishToS3(record, config)

    await vi.advanceTimersByTimeAsync(1_000)

    const location = await locationPromise

    expect(location).toMatch(/^s3:\/\/analytics-bucket\/constituent-events\/batches\//)
    expect(sendMock).toHaveBeenCalledTimes(2)
  })
})
