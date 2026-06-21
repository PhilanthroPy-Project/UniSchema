import type { Connection } from 'reactflow'

import { MAPPABLE_TARGET_FIELDS } from '../types/constituentEvent'
import type { MappingArtifact, MetadataMapping } from '../types/mapping'
import { getMissingRequiredMappings } from '../utils/requiredMappings'
import {
  buildPayloadTree,
  flattenLeafPaths,
  getValueAtPath,
} from '../utils/payloadTree'
import {
  MASTER_SCHEMA_NODE_TYPE,
  VENDOR_NODE_TYPE,
  type ExportedMappingConfiguration,
  type MappingEdge,
  type MappingNode,
  type MappingStoreState,
  type MappingValidationResult,
  type MasterSchemaMappingNode,
  type MappableTargetField,
  type NodeMappingUpdate,
  type TransformationStep,
  type VendorFieldValueType,
  type VendorMappingNode,
} from './mappingStoreTypes'

export const MAPPING_EDGE_TYPE = 'mapping' as const

const SOURCE_COLUMN_X = 48
const TARGET_COLUMN_X = 480
const ROW_HEIGHT = 116

export function vendorNodeId(fieldPath: string): string {
  return `vendor:${fieldPath}`
}

export function masterNodeId(fieldKey: MappableTargetField): string {
  return `master:${fieldKey}`
}

export function mappingEdgeId(sourcePath: string, targetField: MappableTargetField): string {
  return `edge:${sourcePath}:${targetField}`
}

export function inferVendorFieldType(value: unknown): VendorFieldValueType {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return 'object'
    default:
      return 'unknown'
  }
}

export function isMappableTargetField(value: string): value is MappableTargetField {
  return MAPPABLE_TARGET_FIELDS.some((field) => field.key === value)
}

function buildVendorNodes(
  payload: Record<string, unknown>,
  edges: MappingEdge[],
): VendorMappingNode[] {
  const sourcePaths = flattenLeafPaths(buildPayloadTree(payload))
  const connectedPaths = new Set(
    edges.map((edge) => edge.data?.sourcePath ?? edge.sourceHandle).filter(Boolean),
  )

  return sourcePaths.map((fieldPath, index) => {
    const sampleValue = getValueAtPath(payload, fieldPath)

    return {
      id: vendorNodeId(fieldPath),
      type: VENDOR_NODE_TYPE,
      position: { x: SOURCE_COLUMN_X, y: index * ROW_HEIGHT },
      draggable: true,
      data: {
        fieldPath,
        valueType: inferVendorFieldType(sampleValue),
        sampleValue,
        isConnected: connectedPaths.has(fieldPath),
      },
    }
  })
}

function buildMasterSchemaNodes(edges: MappingEdge[]): MasterSchemaMappingNode[] {
  const connectedTargets = new Set(
    edges
      .map((edge) => edge.data?.targetField ?? edge.targetHandle)
      .filter((value): value is MappableTargetField => Boolean(value && isMappableTargetField(value))),
  )

  return MAPPABLE_TARGET_FIELDS.map((field, index) => {
    const isConnected = connectedTargets.has(field.key as MappableTargetField)
    const isRequired = field.requirement === 'required'

    return {
      id: masterNodeId(field.key as MappableTargetField),
      type: MASTER_SCHEMA_NODE_TYPE,
      position: { x: TARGET_COLUMN_X, y: index * ROW_HEIGHT },
      draggable: false,
      data: {
        field,
        isConnected,
        isValid: !isRequired || isConnected,
      },
    }
  })
}

export function rebuildCanvasNodes(state: MappingStoreState): MappingStoreState {
  const nodes: MappingNode[] = [
    ...buildVendorNodes(state.vendorPayload, state.edges),
    ...buildMasterSchemaNodes(state.edges),
  ]

  return {
    ...state,
    nodes,
  }
}

export function createInitialMappingState(
  vendorSlug: string,
  vendorLabel: string,
  payload: Record<string, unknown>,
): MappingStoreState {
  return rebuildCanvasNodes({
    vendorSlug,
    vendorLabel,
    vendorPayload: payload,
    nodes: [],
    edges: [],
    metadataMappings: [],
    selection: null,
    status: 'draft',
    isDirty: false,
    lastSyncedFingerprint: null,
  })
}

function applyConnectionFlags(
  nodes: MappingNode[],
  edges: MappingEdge[],
): MappingNode[] {
  const connectedSources = new Set<string>()
  const connectedTargets = new Set<MappableTargetField>()

  for (const edge of edges) {
    const sourcePath = edge.data?.sourcePath ?? edge.sourceHandle
    const targetField = edge.data?.targetField ?? edge.targetHandle

    if (sourcePath) {
      connectedSources.add(sourcePath)
    }

    if (targetField && isMappableTargetField(targetField)) {
      connectedTargets.add(targetField)
    }
  }

  return nodes.map((node): MappingNode => {
    if (node.type === VENDOR_NODE_TYPE) {
      return {
        ...node,
        data: {
          ...node.data,
          isConnected: connectedSources.has(node.data.fieldPath),
        },
      }
    }

    const masterNode = node as MasterSchemaMappingNode
    const targetKey = masterNode.data.field.key as MappableTargetField
    const isConnected = connectedTargets.has(targetKey)
    const isRequired = masterNode.data.field.requirement === 'required'

    return {
      ...masterNode,
      data: {
        ...masterNode.data,
        isConnected,
        isValid: !isRequired || isConnected,
      },
    }
  })
}

function isValidVendorToMasterConnection(
  connection: Connection,
  nodes: MappingNode[],
): connection is Connection & {
  source: string
  target: string
  sourceHandle: string
  targetHandle: MappableTargetField
} {
  if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
    return false
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  if (!sourceNode || !targetNode) {
    return false
  }

  return (
    sourceNode.type === VENDOR_NODE_TYPE &&
    targetNode.type === MASTER_SCHEMA_NODE_TYPE &&
    isMappableTargetField(connection.targetHandle)
  )
}

export function addNode(state: MappingStoreState, node: MappingNode): MappingStoreState {
  if (state.nodes.some((existing) => existing.id === node.id)) {
    return state
  }

  return {
    ...state,
    nodes: applyConnectionFlags([...state.nodes, node], state.edges),
    isDirty: true,
  }
}

export function removeNode(state: MappingStoreState, nodeId: string): MappingStoreState {
  const node = state.nodes.find((entry) => entry.id === nodeId)

  if (!node || node.type !== VENDOR_NODE_TYPE) {
    return state
  }

  const nextEdges = state.edges.filter(
    (edge) => edge.source !== nodeId && edge.target !== nodeId,
  )

  return {
    ...state,
    nodes: applyConnectionFlags(
      state.nodes.filter((entry) => entry.id !== nodeId),
      nextEdges,
    ),
    edges: nextEdges,
    selection: state.selection?.kind === 'node' && state.selection.nodeId === nodeId ? null : state.selection,
    isDirty: true,
  }
}

export function connectEdge(state: MappingStoreState, connection: Connection): MappingStoreState {
  if (!isValidVendorToMasterConnection(connection, state.nodes)) {
    return state
  }

  const sourcePath = connection.sourceHandle
  const targetField = connection.targetHandle

  const nextEdge: MappingEdge = {
    id: mappingEdgeId(sourcePath, targetField),
    type: MAPPING_EDGE_TYPE,
    source: connection.source,
    target: connection.target,
    sourceHandle: sourcePath,
    targetHandle: targetField,
    animated: true,
    style: { stroke: '#007AFF', strokeWidth: 2 },
    data: {
      sourcePath,
      targetField,
      transformations: [],
    },
  }

  const nextEdges = [
    ...state.edges.filter(
      (edge) =>
        !(
          edge.target === connection.target &&
          edge.targetHandle === connection.targetHandle
        ),
    ),
    nextEdge,
  ]

  return {
    ...state,
    edges: nextEdges,
    nodes: applyConnectionFlags(state.nodes, nextEdges),
    selection: { kind: 'edge', edgeId: nextEdge.id },
    isDirty: true,
  }
}

export function removeEdge(state: MappingStoreState, edgeId: string): MappingStoreState {
  const nextEdges = state.edges.filter((edge) => edge.id !== edgeId)

  return {
    ...state,
    edges: nextEdges,
    nodes: applyConnectionFlags(state.nodes, nextEdges),
    selection:
      state.selection?.kind === 'edge' && state.selection.edgeId === edgeId
        ? null
        : state.selection,
    isDirty: true,
  }
}

export function updateNodeMapping(
  state: MappingStoreState,
  update: NodeMappingUpdate,
): MappingStoreState {
  const nodeIndex = state.nodes.findIndex((node) => node.id === update.nodeId)

  if (nodeIndex === -1) {
    return state
  }

  const node = state.nodes[nodeIndex]

  if (update.kind === 'vendor' && node.type === VENDOR_NODE_TYPE) {
    const nextFieldPath = update.fieldPath ?? node.data.fieldPath
    const nextSampleValue =
      update.sampleValue !== undefined
        ? update.sampleValue
        : getValueAtPath(state.vendorPayload, nextFieldPath)

    const nextNode: VendorMappingNode = {
      ...node,
      id: vendorNodeId(nextFieldPath),
      data: {
        ...node.data,
        fieldPath: nextFieldPath,
        sampleValue: nextSampleValue,
        valueType: inferVendorFieldType(nextSampleValue),
      },
    }

    const nextNodes = [...state.nodes]
    nextNodes[nodeIndex] = nextNode

    return {
      ...state,
      nodes: nextNodes,
      isDirty: true,
    }
  }

  if (update.kind === 'master' && node.type === MASTER_SCHEMA_NODE_TYPE && update.label) {
    const nextNodes = [...state.nodes]
    nextNodes[nodeIndex] = {
      ...node,
      data: {
        ...node.data,
        field: {
          ...node.data.field,
          label: update.label,
        },
      },
    }

    return {
      ...state,
      nodes: nextNodes,
      isDirty: true,
    }
  }

  return state
}

export function updateEdgeMapping(
  state: MappingStoreState,
  edgeId: string,
  transformations: TransformationStep[],
): MappingStoreState {
  const edgeIndex = state.edges.findIndex((edge) => edge.id === edgeId)

  if (edgeIndex === -1) {
    return state
  }

  const edge = state.edges[edgeIndex]
  const nextEdges = [...state.edges]

  nextEdges[edgeIndex] = {
    ...edge,
    data: {
      sourcePath: edge.data?.sourcePath ?? edge.sourceHandle ?? '',
      targetField: (edge.data?.targetField ??
        edge.targetHandle ??
        'constituentEmail') as MappableTargetField,
      transformations,
    },
  }

  return {
    ...state,
    edges: nextEdges,
    isDirty: true,
  }
}

export function setVendorPayload(
  state: MappingStoreState,
  payload: Record<string, unknown>,
): MappingStoreState {
  return rebuildCanvasNodes({
    ...state,
    vendorPayload: payload,
    edges: state.edges.filter((edge) => {
      const sourcePath = edge.data?.sourcePath ?? edge.sourceHandle
      if (!sourcePath) {
        return false
      }

      return flattenLeafPaths(buildPayloadTree(payload)).includes(sourcePath)
    }),
    isDirty: true,
  })
}

export function loadFromArtifact(
  state: MappingStoreState,
  artifact: MappingArtifact,
): MappingStoreState {
  const edges: MappingEdge[] = artifact.mappings
    .filter((mapping): mapping is typeof mapping & { target: MappableTargetField } =>
      isMappableTargetField(mapping.target),
    )
    .map((mapping) => ({
      id: mappingEdgeId(mapping.source, mapping.target),
      type: MAPPING_EDGE_TYPE,
      source: vendorNodeId(mapping.source),
      target: masterNodeId(mapping.target),
      sourceHandle: mapping.source,
      targetHandle: mapping.target,
      animated: true,
      style: { stroke: '#007AFF', strokeWidth: 2 },
      data: {
        sourcePath: mapping.source,
        targetField: mapping.target,
        transformations: [],
      },
    }))

  const nextState: MappingStoreState = {
    ...state,
    vendorLabel: artifact.vendor,
    edges,
    metadataMappings: artifact.metadataMappings ?? [],
    selection: null,
    status: 'draft',
    isDirty: false,
  }

  return rebuildCanvasNodes(nextState)
}

export function exportMappingConfiguration(
  state: MappingStoreState,
): ExportedMappingConfiguration {
  const mappings = state.edges
    .map((edge) => {
      const sourcePath = edge.data?.sourcePath ?? edge.sourceHandle
      const targetField = edge.data?.targetField ?? edge.targetHandle

      if (!sourcePath || !targetField || !isMappableTargetField(targetField)) {
        return null
      }

      return {
        source: sourcePath,
        target: targetField,
        transformations: edge.data?.transformations ?? [],
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target))

  return {
    vendor: state.vendorLabel,
    exportedAt: new Date().toISOString(),
    status: state.status,
    mappings,
    metadataMappings: state.metadataMappings,
  }
}

export function toMappingArtifact(state: MappingStoreState): MappingArtifact {
  const exported = exportMappingConfiguration(state)

  return {
    vendor: state.vendorLabel,
    exportedAt: exported.exportedAt,
    mappings: exported.mappings.map(({ source, target }) => ({ source, target })),
    metadataMappings: exported.metadataMappings,
  }
}

export function setMetadataMappingsPure(
  state: MappingStoreState,
  metadataMappings: MetadataMapping[],
): MappingStoreState {
  return {
    ...state,
    metadataMappings,
    isDirty: true,
  }
}

export function getMappingsFingerprint(state: MappingStoreState): string {
  const artifact = toMappingArtifact(state)
  const sortedMappings = [...artifact.mappings].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  )
  const sortedMetadata = [...(artifact.metadataMappings ?? [])].sort(
    (a, b) => a.key.localeCompare(b.key) || a.source.localeCompare(b.source),
  )

  return JSON.stringify({ mappings: sortedMappings, metadata: sortedMetadata })
}

export function validateMappingState(state: MappingStoreState): MappingValidationResult {
  const missingRequired = getMissingRequiredMappings(state.edges)

  if (missingRequired.length === 0) {
    return { ok: true }
  }

  return {
    ok: false,
    missingRequired,
    message: `Map required fields: ${missingRequired.join(', ')}`,
  }
}
