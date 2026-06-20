export type EgressTarget = 'local' | 's3' | 'none'

export type EgressConfig = {
  readonly target: EgressTarget
  readonly localDir: string
  readonly s3Bucket?: string
  readonly s3Prefix: string
  readonly s3Region: string
}

export function resolveEgressConfig(): EgressConfig {
  const target = (process.env.EGRESS_TARGET ?? 'local') as EgressTarget

  return {
    target,
    localDir: process.env.EGRESS_LOCAL_DIR ?? 'data/egress',
    s3Bucket: process.env.EGRESS_S3_BUCKET,
    s3Prefix: process.env.EGRESS_S3_PREFIX ?? 'constituent-events',
    s3Region: process.env.AWS_REGION ?? process.env.EGRESS_S3_REGION ?? 'us-east-1',
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
