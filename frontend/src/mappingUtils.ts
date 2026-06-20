import type { Edge } from 'reactflow'

import type { ConstituentEventFieldKey } from './types/constituentEvent'
import type { MappingArtifact, MappingConnection } from './types/mapping'
import { isConstituentEventFieldKey } from './utils/connectionValidation'

export type { MappingArtifact, MappingConnection } from './types/mapping'

export type SourceField =
  | 'id'
  | 'donation_type'
  | 'value'
  | 'currency'
  | 'donor_email'

export type DestinationField =
  | 'eventId'
  | 'constituentEmail'
  | 'eventType'
  | 'amount'
  | 'currency'

export function toMappingConnections(edges: Edge[]): MappingConnection[] {
  return edges
    .filter(
      (
        edge,
      ): edge is Edge & {
        sourceHandle: string
        targetHandle: ConstituentEventFieldKey
      } =>
        Boolean(edge.sourceHandle && edge.targetHandle) &&
        isConstituentEventFieldKey(edge.targetHandle),
    )
    .map((edge) => ({
      source: edge.sourceHandle,
      target: edge.targetHandle,
    }))
}

export function buildMappingArtifact(
  vendor: string,
  edges: Edge[],
): MappingArtifact {
  return {
    vendor,
    exportedAt: new Date().toISOString(),
    mappings: toMappingConnections(edges),
  }
}

export function serializeMappingArtifact(artifact: MappingArtifact): string {
  return JSON.stringify(artifact, null, 2)
}
