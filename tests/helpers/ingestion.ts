import { processIngestion } from '../../src/middleware/webhookHandler.js'
import { getIngestion, type IngestionRecord } from '../../src/store/ingestionQueue.js'

export async function waitForIngestion(
  ingestionId: string,
  timeoutMs = 3000,
): Promise<IngestionRecord> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const record = getIngestion(ingestionId)

    if (record && record.status !== 'pending') {
      return record
    }

    await new Promise((resolve) => setTimeout(resolve, 5))
  }

  throw new Error(`Ingestion ${ingestionId} did not complete within ${timeoutMs}ms`)
}

/** Runs ingestion synchronously — useful when queueMicrotask ordering is flaky. */
export async function runIngestion(
  ingestionId: string,
  vendor: 'cvent' | 'givecampus',
  failureMessage: string,
): Promise<IngestionRecord> {
  await processIngestion(ingestionId, { vendor, failureMessage })
  const record = getIngestion(ingestionId)

  if (!record) {
    throw new Error(`Ingestion ${ingestionId} not found`)
  }

  return record
}
