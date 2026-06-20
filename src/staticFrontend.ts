import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { serveStatic } from '@hono/node-server/serve-static'
import type { Hono } from 'hono'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendDist = path.join(repoRoot, 'frontend', 'dist')

export function resolveFrontendDistPath(): string {
  return frontendDist
}

export function shouldServeBundledFrontend(): boolean {
  if (process.env.SERVE_FRONTEND === 'false') {
    return false
  }

  if (process.env.SERVE_FRONTEND === 'true') {
    return true
  }

  if (process.env.NODE_ENV === 'test') {
    return false
  }

  return existsSync(path.join(frontendDist, 'index.html'))
}

/** Serves the Vite production build and SPA fallback for non-API routes. */
export function registerBundledFrontend(app: Hono): void {
  if (!shouldServeBundledFrontend()) {
    return
  }

  app.use('/assets/*', serveStatic({ root: frontendDist }))
  app.use('/*', serveStatic({ root: frontendDist }))
  app.get(
    '*',
    serveStatic({
      root: frontendDist,
      rewriteRequestPath: () => '/index.html',
    }),
  )
}
