import type { Edge } from 'reactflow'

import type { ConstituentEventFieldKey } from './types/constituentEvent'
import type { MappingArtifact, MappingConnection, MetadataMapping } from './types/mapping'
import { isConstituentEventFieldKey } from './utils/connectionValidation'

export type { MappingArtifact, MappingConnection, MetadataMapping } from './types/mapping'

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

export function edgesFromMappingConnections(mappings: MappingConnection[]): Edge[] {
  return mappings.map((mapping) => ({
    id: `edge-${mapping.source}-${mapping.target}`,
    source: `source-${mapping.source}`,
    target: `target-${mapping.target}`,
    sourceHandle: mapping.source,
    targetHandle: mapping.target,
    animated: true,
    style: { stroke: '#007AFF', strokeWidth: 2 },
  }))
}

export function buildMappingArtifact(
  vendor: string,
  edges: Edge[],
  metadataMappings: MetadataMapping[] = [],
): MappingArtifact {
  return {
    vendor,
    exportedAt: new Date().toISOString(),
    mappings: toMappingConnections(edges),
    metadataMappings,
  }
}

export function serializeMappingArtifact(artifact: MappingArtifact): string {
  return JSON.stringify(artifact, null, 2)
}

function fingerprintMetadata(mappings: MetadataMapping[]): string {
  return JSON.stringify(
    [...mappings].sort((a, b) => a.key.localeCompare(b.key) || a.source.localeCompare(b.source)),
  )
}

/** Stable fingerprint of mapping connections for sync-state comparison. */
export function getMappingsFingerprint(
  edges: Edge[],
  metadataMappings: MetadataMapping[] = [],
): string {
  const sorted = [...toMappingConnections(edges)].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  )

  return JSON.stringify({ mappings: sorted, metadata: fingerprintMetadata(metadataMappings) })
}
