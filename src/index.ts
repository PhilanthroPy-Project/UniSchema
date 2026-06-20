import { Hono } from 'hono'
import { ZodError } from 'zod'

import { mapCventToMaster } from './mappers/cvent.js'
import { mapGiveCampusToMaster } from './mappers/givecampus.js'

const app = new Hono()

app.post('/webhooks/cvent', async (c) => {
  try {
    const body = await c.req.json()
    const mapped = mapCventToMaster(body)

    return c.json(mapped, 200)
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          message: 'Failed to map Cvent payload to master schema',
          errors: error.flatten(),
        },
        400,
      )
    }

    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown mapping error',
      },
      400,
    )
  }
})

app.post('/webhooks/givecampus', async (c) => {
  try {
    const body = await c.req.json()
    const mapped = mapGiveCampusToMaster(body)

    return c.json(mapped, 200)
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          message: 'Failed to map GiveCampus payload to master schema',
          errors: error.flatten(),
        },
        400,
      )
    }

    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown mapping error',
      },
      400,
    )
  }
})

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
