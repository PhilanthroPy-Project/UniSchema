import { describe, expect, it, vi } from 'vitest'

import { logError, logInfo, logWarn } from '../../src/utils/logger.js'

describe('structured logger', () => {
  it('writes JSON info logs', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logInfo('test message', { vendor: 'givecampus' })

    const line = JSON.parse(String(spy.mock.calls[0]?.[0]))
    expect(line.level).toBe('info')
    expect(line.message).toBe('test message')
    expect(line.vendor).toBe('givecampus')

    spy.mockRestore()
  })

  it('writes JSON warn and error logs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logWarn('warn message')
    logError('error message')

    expect(JSON.parse(String(warnSpy.mock.calls[0]?.[0])).level).toBe('warn')
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0])).level).toBe('error')

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
