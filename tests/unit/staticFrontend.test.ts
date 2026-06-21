import { existsSync } from 'node:fs'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  }
})

import {
  registerBundledFrontend,
  resolveFrontendDistPath,
  shouldServeBundledFrontend,
} from '../../src/staticFrontend.js'

const mockedExistsSync = vi.mocked(existsSync)

describe('staticFrontend', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    mockedExistsSync.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('resolveFrontendDistPath points at frontend/dist under the repo root', () => {
    expect(resolveFrontendDistPath()).toMatch(/frontend[/\\]dist$/)
  })

  it('shouldServeBundledFrontend returns false when SERVE_FRONTEND=false', () => {
    process.env.SERVE_FRONTEND = 'false'
    expect(shouldServeBundledFrontend()).toBe(false)
  })

  it('shouldServeBundledFrontend returns true when SERVE_FRONTEND=true', () => {
    process.env.SERVE_FRONTEND = 'true'
    expect(shouldServeBundledFrontend()).toBe(true)
  })

  it('shouldServeBundledFrontend returns false in test env without an explicit flag', () => {
    delete process.env.SERVE_FRONTEND
    process.env.NODE_ENV = 'test'
    expect(shouldServeBundledFrontend()).toBe(false)
  })

  it('shouldServeBundledFrontend auto-enables when dist/index.html exists', () => {
    delete process.env.SERVE_FRONTEND
    delete process.env.NODE_ENV
    mockedExistsSync.mockReturnValue(true)
    expect(shouldServeBundledFrontend()).toBe(true)
  })

  it('registerBundledFrontend is a no-op when serving is disabled', async () => {
    process.env.SERVE_FRONTEND = 'false'
    const app = new Hono()
    registerBundledFrontend(app)

    const response = await app.request('/')
    expect(response.status).toBe(404)
  })
})
