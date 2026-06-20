import type { EgressEventRecord } from '../store/egressStore.js'
import { isEgressEnabled, resolveEgressConfig, type EgressConfig } from './config.js'
import { publishToLocalFilesystem } from './localPublisher.js'
import { publishToS3 } from './s3Publisher.js'

export type EgressPublishResult = {
  location: string
  target: EgressConfig['target']
}

export async function publishEgressEvent(
  record: EgressEventRecord,
  config: EgressConfig = resolveEgressConfig(),
): Promise<EgressPublishResult> {
  if (!isEgressEnabled(config)) {
    throw new Error('Egress publishing is disabled')
  }

  switch (config.target) {
    case 'local': {
      const location = await publishToLocalFilesystem(record, config.localDir, config.s3Prefix)
      return { location, target: 'local' }
    }
    case 's3': {
      const location = await publishToS3(record, config)
      return { location, target: 's3' }
    }
    case 'none':
      throw new Error('Egress publishing is disabled')
  }
}
