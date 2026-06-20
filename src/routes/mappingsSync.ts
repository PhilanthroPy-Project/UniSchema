import type { Context } from 'hono'
import { ZodError } from 'zod'

import {
  MappingArtifactSchema,
  type MappingSyncResponse,
} from '../schema/mapping.js'
import { upsertMapping } from '../store/mappingRegistry.js'
import { resolveMappingSyncAuth, isMappingSyncAuthorized } from '../utils/mappingSyncAuth.js'

type MappingSyncErrorBody = {
  success: false
  message: string
  errors?: ReturnType<ZodError['flatten']>
}

export async function handleMappingSync(c: Context): Promise<Response> {
  const authDecision = resolveMappingSyncAuth()

  if (authDecision.action === 'misconfigured') {
    const body: MappingSyncErrorBody = {
      success: false,
      message: 'Mapping sync token not configured',
    }
    return c.json(body, 500)
  }

  if (!isMappingSyncAuthorized(c)) {
    const body: MappingSyncErrorBody = {
      success: false,
      message: 'Unauthorized',
    }
    return c.json(body, 401)
  }

  let rawBody: unknown

  try {
    rawBody = await c.req.json()
  } catch {
    const body: MappingSyncErrorBody = {
      success: false,
      message: 'Request body must be valid JSON',
    }
    return c.json(body, 400)
  }

  const parsed = MappingArtifactSchema.safeParse(rawBody)

  if (!parsed.success) {
    const body: MappingSyncErrorBody = {
      success: false,
      message: 'Mapping artifact failed validation',
      errors: parsed.error.flatten(),
    }
    return c.json(body, 400)
  }

  const syncedAt = new Date().toISOString()
  const stored = upsertMapping(parsed.data, syncedAt)

  const response: MappingSyncResponse = {
    success: true,
    vendor: stored.vendor,
    mappingCount: stored.mappings.length,
    syncedAt: stored.syncedAt,
  }

  return c.json(response, 200)
}
