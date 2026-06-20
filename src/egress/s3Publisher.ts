import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import type { EgressEventRecord } from '../store/egressStore.js'
import type { EgressConfig } from './config.js'
import { buildEgressObjectKey } from './objectKey.js'

let s3Client: S3Client | undefined

function getS3Client(region: string): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region })
  }

  return s3Client
}

export async function publishToS3(
  record: EgressEventRecord,
  config: EgressConfig,
): Promise<string> {
  if (!config.s3Bucket) {
    throw new Error('EGRESS_S3_BUCKET is required when EGRESS_TARGET=s3')
  }

  const objectKey = buildEgressObjectKey(record, config.s3Prefix)
  const body = `${JSON.stringify(record.event)}\n`

  await getS3Client(config.s3Region).send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: objectKey,
      Body: body,
      ContentType: 'application/x-ndjson',
      Metadata: {
        vendor: record.vendor,
        eventId: record.eventId,
      },
    }),
  )

  return `s3://${config.s3Bucket}/${objectKey}`
}

/** Test-only helper — resets cached S3 client between cases. */
export function resetS3ClientForTests(): void {
  s3Client = undefined
}
