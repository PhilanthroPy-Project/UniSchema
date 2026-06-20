import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import { isDriftAgentAuthorized, verifyDriftAgentSignature } from '../src/utils/driftAgentAuth.js'

function mockContext(headers: Record<string, string>) {
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
    },
  } as Parameters<typeof isDriftAgentAuthorized>[0]
}

describe('isDriftAgentAuthorized', () => {
  const originalToken = process.env.DRIFT_AGENT_TOKEN

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.DRIFT_AGENT_TOKEN
    } else {
      process.env.DRIFT_AGENT_TOKEN = originalToken
    }
  })

  it('rejects requests when the agent token is not configured', () => {
    delete process.env.DRIFT_AGENT_TOKEN

    expect(isDriftAgentAuthorized(mockContext({ Authorization: 'Bearer test-agent-token' }))).toBe(
      false,
    )
  })

  it('accepts a valid bearer token', () => {
    process.env.DRIFT_AGENT_TOKEN = 'test-agent-token'

    expect(isDriftAgentAuthorized(mockContext({ Authorization: 'Bearer test-agent-token' }))).toBe(
      true,
    )
  })

  it('rejects malformed bearer tokens', () => {
    process.env.DRIFT_AGENT_TOKEN = 'test-agent-token'

    expect(isDriftAgentAuthorized(mockContext({ Authorization: 'Bearer wrong-token' }))).toBe(
      false,
    )
  })
})

describe('verifyDriftAgentSignature', () => {
  const originalToken = process.env.DRIFT_AGENT_TOKEN

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.DRIFT_AGENT_TOKEN
    } else {
      process.env.DRIFT_AGENT_TOKEN = originalToken
    }
  })

  it('returns false when the secret or signature header is missing', () => {
    delete process.env.DRIFT_AGENT_TOKEN

    expect(verifyDriftAgentSignature('{}', 'abc')).toBe(false)
    expect(verifyDriftAgentSignature('{}', undefined)).toBe(false)
  })

  it('validates HMAC signatures for drift agent callbacks', () => {
    process.env.DRIFT_AGENT_TOKEN = 'test-agent-token'

    const body = '{"status":"processed"}'
    const signature = createHmac('sha256', 'test-agent-token').update(body).digest('hex')

    expect(verifyDriftAgentSignature(body, signature)).toBe(true)
    expect(verifyDriftAgentSignature(body, `${signature}x`)).toBe(false)
  })
})
