import type { ConstituentEventFieldKey } from './constituentEvent'

export type MetadataMapping = {
  source: string
  key: string
}

export type MappingConnection = {
  source: string
  target: ConstituentEventFieldKey
}

export type MappingArtifact = {
  vendor: string
  exportedAt: string
  mappings: MappingConnection[]
  metadataMappings?: Array<{ source: string; key: string }>
}
