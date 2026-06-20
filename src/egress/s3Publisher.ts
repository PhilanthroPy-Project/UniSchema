import { randomUUID } from 'node:crypto'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import type { EgressEventRecord } from '../store/egressStore.js'
import { notifyAirflowBatchReady } from './airflowNotifier.js'
import {
  buildEgressBatchManifest,
  buildManifestObjectKey,
  type EgressBatchManifest,
} from './batchManifest.js'
import type { EgressConfig } from './config.js'

let s3Client: S3Client | undefined

type BufferedRecord = {
  record: EgressEventRecord
  byteSize: number
  resolve: (location: string) => void
  reject: (error: unknown) => void
}

type S3BufferState = {
  records: BufferedRecord[]
  bufferBytes: number
  flushTimer?: ReturnType<typeof setTimeout>
  flushPromise?: Promise<void>
}

const buffers = new Map<string, S3BufferState>()

function getS3Client(region: string): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region })
  }

  return s3Client
}

function bufferKey(config: EgressConfig): string {
  return `${config.s3Region}:${config.s3Bucket}:${config.s3Prefix}`
}

/** Estimates NDJSON line size for a single constituent event (including trailing newline). */
export function estimateRecordByteSize(record: EgressEventRecord): number {
  return Buffer.byteLength(`${JSON.stringify(record.event)}\n`, 'utf8')
}

function buildBatchObjectKey(records: EgressEventRecord[], prefix: string): string {
  const latestCreatedAt = records.reduce((latest, record) => {
    return record.createdAt > latest ? record.createdAt : latest
  }, records[0].createdAt)
  const createdAt = new Date(latestCreatedAt)
  const year = createdAt.getUTCFullYear()
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(createdAt.getUTCDate()).padStart(2, '0')
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '')
  const batchId = randomUUID()

  return `${normalizedPrefix}/batches/${year}/${month}/${day}/${batchId}.ndjson`
}

function buildNdjsonBody(records: EgressEventRecord[]): string {
  return records.map((record) => JSON.stringify(record.event)).join('\n').concat('\n')
}

async function uploadManifest(
  manifest: EgressBatchManifest,
  config: EgressConfig,
): Promise<void> {
  if (!config.s3Bucket) {
    return
  }

  const manifestKey = buildManifestObjectKey(manifest.objectKey)

  await getS3Client(config.s3Region).send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: manifestKey,
      Body: `${JSON.stringify(manifest, null, 2)}\n`,
      ContentType: 'application/json',
      Metadata: {
        recordCount: String(manifest.recordCount),
        event: manifest.event,
      },
    }),
  )
}

async function uploadBatch(
  records: EgressEventRecord[],
  byteSize: number,
  config: EgressConfig,
): Promise<string> {
  if (!config.s3Bucket) {
    throw new Error('EGRESS_S3_BUCKET is required when EGRESS_TARGET=s3')
  }

  const objectKey = buildBatchObjectKey(records, config.s3Prefix)
  const batchId = objectKey.split('/').pop()?.replace(/\.ndjson$/, '') ?? randomUUID()

  await getS3Client(config.s3Region).send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: objectKey,
      Body: buildNdjsonBody(records),
      ContentType: 'application/x-ndjson',
      Metadata: {
        recordCount: String(records.length),
        byteSize: String(byteSize),
        vendors: [...new Set(records.map((record) => record.vendor))].join(','),
      },
    }),
  )

  const manifest = buildEgressBatchManifest(
    records,
    config.s3Bucket,
    objectKey,
    byteSize,
    batchId,
  )

  await uploadManifest(manifest, config)

  try {
    await notifyAirflowBatchReady(manifest, config)
  } catch (error) {
    console.error('[egress] Airflow webhook notification failed; batch uploaded to S3', {
      s3Uri: manifest.s3Uri,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return manifest.s3Uri
}

function shouldFlushBySize(bufferBytes: number, config: EgressConfig): boolean {
  return bufferBytes >= config.s3BatchMaxBytes
}

async function flushBuffer(config: EgressConfig): Promise<void> {
  const key = bufferKey(config)
  const state = buffers.get(key)

  if (!state || state.records.length === 0) {
    return
  }

  if (state.flushTimer) {
    clearTimeout(state.flushTimer)
    state.flushTimer = undefined
  }

  const pending = state.records.splice(0)
  const bufferBytes = state.bufferBytes
  state.bufferBytes = 0

  const records = pending.map((entry) => entry.record)

  try {
    const location = await uploadBatch(records, bufferBytes, config)
    pending.forEach((entry) => entry.resolve(location))
  } catch (error) {
    state.records.unshift(...pending)
    state.bufferBytes = pending.reduce((total, entry) => total + entry.byteSize, 0)
    pending.forEach((entry) => entry.reject(error))
    throw error
  }
}

function scheduleFlush(config: EgressConfig): void {
  const key = bufferKey(config)
  const state = buffers.get(key)

  if (!state || state.flushTimer) {
    return
  }

  state.flushTimer = setTimeout(() => {
    state.flushTimer = undefined
    void flushBuffer(config).catch((error) => {
      console.error('[egress] failed to flush S3 batch buffer', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }, config.s3FlushIntervalMs)
}

/**
 * Buffers constituent events and flushes them as a single NDJSON object when the
 * in-memory buffer reaches `s3BatchMaxBytes` or after `s3FlushIntervalMs` of inactivity.
 */
export async function publishToS3(
  record: EgressEventRecord,
  config: EgressConfig,
): Promise<string> {
  if (!config.s3Bucket) {
    throw new Error('EGRESS_S3_BUCKET is required when EGRESS_TARGET=s3')
  }

  const key = bufferKey(config)
  let state = buffers.get(key)

  if (!state) {
    state = { records: [], bufferBytes: 0 }
    buffers.set(key, state)
  }

  const byteSize = estimateRecordByteSize(record)

  const locationPromise = new Promise<string>((resolve, reject) => {
    state.records.push({ record, byteSize, resolve, reject })
    state.bufferBytes += byteSize
  })

  if (shouldFlushBySize(state.bufferBytes, config)) {
    if (!state.flushPromise) {
      state.flushPromise = flushBuffer(config).finally(() => {
        state.flushPromise = undefined
      })
    }

    await state.flushPromise.catch(() => undefined)
  } else {
    scheduleFlush(config)
  }

  return locationPromise
}

/** Forces any buffered records to S3 — use during graceful shutdown or in tests. */
export async function flushS3Buffer(config: EgressConfig): Promise<void> {
  const key = bufferKey(config)
  const state = buffers.get(key)

  if (!state) {
    return
  }

  if (state.flushPromise) {
    await state.flushPromise
  }

  if (state.records.length > 0) {
    await flushBuffer(config)
  }
}

/** Test-only helper — resets cached S3 client and in-memory buffers between cases. */
export function resetS3ClientForTests(): void {
  for (const state of buffers.values()) {
    if (state.flushTimer) {
      clearTimeout(state.flushTimer)
    }
  }

  buffers.clear()
  s3Client = undefined
}
