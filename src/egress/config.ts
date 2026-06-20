export type EgressTarget = 'local' | 's3' | 'none'

export type EgressConfig = {
  readonly target: EgressTarget
  readonly localDir: string
  readonly s3Bucket?: string
  readonly s3Prefix: string
  readonly s3Region: string
  /** Flush buffered NDJSON to S3 when the in-memory buffer reaches this size. */
  readonly s3BatchMaxBytes: number
  /** Flush buffered NDJSON to S3 after this idle interval (milliseconds). */
  readonly s3FlushIntervalMs: number
  /** Optional webhook URL (Airflow REST API or custom DAG trigger). */
  readonly airflowWebhookUrl?: string
  /** Optional shared secret sent as `Authorization: Bearer <secret>`. */
  readonly airflowWebhookSecret?: string
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.floor(parsed)
}

export function resolveEgressConfig(): EgressConfig {
  const target = (process.env.EGRESS_TARGET ?? 'local') as EgressTarget

  return {
    target,
    localDir: process.env.EGRESS_LOCAL_DIR ?? 'data/egress',
    s3Bucket: process.env.EGRESS_S3_BUCKET,
    s3Prefix: process.env.EGRESS_S3_PREFIX ?? 'constituent-events',
    s3Region: process.env.AWS_REGION ?? process.env.EGRESS_S3_REGION ?? 'us-east-1',
    s3BatchMaxBytes: parsePositiveInt(process.env.EGRESS_S3_BATCH_MAX_BYTES, 5 * 1024 * 1024),
    s3FlushIntervalMs: parsePositiveInt(process.env.EGRESS_S3_FLUSH_INTERVAL_MS, 120_000),
    airflowWebhookUrl: process.env.AIRFLOW_WEBHOOK_URL,
    airflowWebhookSecret: process.env.AIRFLOW_WEBHOOK_SECRET,
  }
}

export function isEgressEnabled(config: EgressConfig = resolveEgressConfig()): boolean {
  if (config.target === 'none') {
    return false
  }

  if (config.target === 's3') {
    return Boolean(config.s3Bucket)
  }

  return true
}
