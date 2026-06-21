import { VENDOR_WEBHOOK_CONFIGS } from '../config/webhookRoutes.js'
import { getEgressConfigSummary } from '../egress/config.js'

export type ConfigValidationIssue = {
  code: string
  message: string
}

/**
 * Validates production-critical environment variables at startup.
 * Returns actionable errors when NODE_ENV=production.
 */
export function validateProductionConfig(): ConfigValidationIssue[] {
  if (process.env.NODE_ENV !== 'production') {
    return []
  }

  const issues: ConfigValidationIssue[] = []

  if (process.env.WEBHOOK_SIGNATURE_REQUIRED !== 'false') {
    for (const config of Object.values(VENDOR_WEBHOOK_CONFIGS)) {
      const secretKey = config.secretEnvKey
      if (!secretKey) {
        continue
      }

      const secret = process.env[secretKey]
      if (!secret?.trim()) {
        issues.push({
          code: 'WEBHOOK_SECRET_MISSING',
          message: `Set ${secretKey} for production HMAC verification on /webhooks/${config.vendor}`,
        })
      }
    }
  }

  if (process.env.MAPPING_SYNC_REQUIRED === 'true' && !process.env.MAPPING_SYNC_TOKEN?.trim()) {
    issues.push({
      code: 'MAPPING_SYNC_TOKEN_MISSING',
      message: 'Set MAPPING_SYNC_TOKEN when MAPPING_SYNC_REQUIRED=true',
    })
  }

  if (process.env.NODE_ENV === 'production' && !process.env.MAPPING_SYNC_TOKEN?.trim()) {
    issues.push({
      code: 'MAPPING_SYNC_TOKEN_MISSING',
      message: 'Set MAPPING_SYNC_TOKEN for production admin API access',
    })
  }

  if (process.env.NODE_ENV === 'production' && !process.env.DRIFT_AGENT_TOKEN?.trim()) {
    issues.push({
      code: 'DRIFT_AGENT_TOKEN_MISSING',
      message: 'Set DRIFT_AGENT_TOKEN for production drift queue API access',
    })
  }

  const egress = getEgressConfigSummary()

  if (egress.target === 's3') {
    if (!process.env.EGRESS_S3_BUCKET?.trim()) {
      issues.push({
        code: 'EGRESS_S3_BUCKET_MISSING',
        message: 'Set EGRESS_S3_BUCKET when EGRESS_TARGET=s3',
      })
    }

    if (!process.env.AWS_REGION?.trim()) {
      issues.push({
        code: 'AWS_REGION_MISSING',
        message: 'Set AWS_REGION when EGRESS_TARGET=s3',
      })
    }
  }

  if (process.env.TRUST_PROXY !== 'true' && process.env.REQUIRE_TRUST_PROXY === 'true') {
    issues.push({
      code: 'TRUST_PROXY_REQUIRED',
      message: 'Set TRUST_PROXY=true when deployed behind Fly/Railway/nginx',
    })
  }

  return issues
}

export function formatConfigValidationError(issues: ConfigValidationIssue[]): string {
  const lines = issues.map((issue) => `  - [${issue.code}] ${issue.message}`)
  return `Production configuration errors:\n${lines.join('\n')}\nSee docs/operator-guide.md and .env.example`
}
