import type { EgressEventRecord } from '../store/egressStore.js'

export type EgressBatchManifest = {
  event: 'egress.batch.ready'
  batchId: string
  s3Uri: string
  manifestUri: string
  objectKey: string
  bucket: string
  recordCount: number
  byteSize: number
  vendors: string[]
  uploadedAt: string
  format: 'ndjson'
}

export function buildManifestObjectKey(ndjsonObjectKey: string): string {
  return ndjsonObjectKey.replace(/\.ndjson$/, '.manifest.json')
}

export function buildEgressBatchManifest(
  records: EgressEventRecord[],
  bucket: string,
  objectKey: string,
  byteSize: number,
  batchId: string,
): EgressBatchManifest {
  const s3Uri = `s3://${bucket}/${objectKey}`

  return {
    event: 'egress.batch.ready',
    batchId,
    s3Uri,
    manifestUri: `s3://${bucket}/${buildManifestObjectKey(objectKey)}`,
    objectKey,
    bucket,
    recordCount: records.length,
    byteSize,
    vendors: [...new Set(records.map((record) => record.vendor))],
    uploadedAt: new Date().toISOString(),
    format: 'ndjson',
  }
}
