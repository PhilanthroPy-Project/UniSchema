import { describe, expect, it, vi } from 'vitest'

import { scheduleIngestion } from '../src/store/ingestionWorker.js'

describe('scheduleIngestion', () => {
  it('swallows background processing rejections without unhandled rejections', async () => {
    vi.spyOn(await import('../src/middleware/webhookHandler.js'), 'processIngestion').mockRejectedValue(
      new Error('background failure'),
    )

    expect(() =>
      scheduleIngestion('ingestion-1', { vendor: 'cvent', failureMessage: 'fail' }),
    ).not.toThrow()

    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))

    vi.restoreAllMocks()
  })
})
