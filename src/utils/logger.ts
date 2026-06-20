type LogFields = Record<string, unknown>

function writeLog(level: 'info' | 'warn' | 'error', message: string, fields?: LogFields): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  }

  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.info(line)
}

export function logInfo(message: string, fields?: LogFields): void {
  writeLog('info', message, fields)
}

export function logWarn(message: string, fields?: LogFields): void {
  writeLog('warn', message, fields)
}

export function logError(message: string, fields?: LogFields): void {
  writeLog('error', message, fields)
}
