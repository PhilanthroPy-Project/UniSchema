import type { ConstituentEventFieldKey } from './constituentEvent'

export type MappingConnection = {
  source: string
  target: ConstituentEventFieldKey
}

export type MappingArtifact = {
  vendor: string
  exportedAt: string
  mappings: MappingConnection[]
}
