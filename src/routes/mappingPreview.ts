import type { Context } from 'hono'
import { ZodError } from 'zod'

import { mapWithArtifact } from '../mappers/dynamic.js'
import { MappingArtifactSchema } from '../schema/mapping.js'
import { isMappingSyncAuthorized, resolveMappingSyncAuth } from '../utils/mappingSyncAuth.js'

type PreviewErrorBody = {
  success: false
  message: string
  errors?: ReturnType<ZodError['flatten']>
}

export async function handleMappingPreview(c: Context): Promise<Response> {
  const authDecision = resolveMappingSyncAuth()

  if (authDecision.action === 'misconfigured') {
    return c.json({ success: false, message: 'Mapping sync token not configured' }, 500)
  }

  if (!(await isMappingSyncAuthorized(c))) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  let rawBody: unknown

  try {
    rawBody = await c.req.json()
  } catch {
    return c.json({ success: false, message: 'Request body must be valid JSON' }, 400)
  }

  const parsed = MappingArtifactSchema.safeParse(rawBody)

  if (!parsed.success) {
    const body: PreviewErrorBody = {
      success: false,
      message: 'Mapping artifact failed validation',
      errors: parsed.error.flatten(),
    }
    return c.json(body, 400)
  }

  const samplePayload =
    typeof rawBody === 'object' &&
    rawBody !== null &&
    'samplePayload' in rawBody &&
    typeof (rawBody as { samplePayload: unknown }).samplePayload === 'object'
      ? (rawBody as { samplePayload: Record<string, unknown> }).samplePayload
      : null

  if (!samplePayload) {
    return c.json({ success: false, message: 'samplePayload object is required' }, 400)
  }

  try {
    const event = mapWithArtifact(samplePayload, parsed.data)

    return c.json({
      success: true,
      event,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          message: 'Mapping preview failed validation',
          errors: error.flatten(),
        },
        422,
      )
    }

    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Preview failed',
      },
      422,
    )
  }
}
