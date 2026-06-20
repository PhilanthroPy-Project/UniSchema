import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { EgressEventRecord } from '../store/egressStore.js'
import { buildEgressObjectKey } from './objectKey.js'

export async function publishToLocalFilesystem(
  record: EgressEventRecord,
  localDir: string,
  prefix: string,
): Promise<string> {
  const objectKey = buildEgressObjectKey(record, prefix)
  const destination = path.join(localDir, objectKey)

  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, `${JSON.stringify(record.event, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })

  return destination
}
