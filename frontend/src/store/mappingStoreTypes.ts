import type { Connection, Edge, Node } from 'reactflow'

import type { ConstituentEventFieldMeta } from '../types/constituentEvent'
import type { MappingArtifact, MetadataMapping } from '../types/mapping'

/** React Flow node type identifiers — keep in sync with node component registrations. */
export const VENDOR_NODE_TYPE = 'vendorField' as const
export const MASTER_SCHEMA_NODE_TYPE = 'masterSchemaField' as const

export type VendorNodeType = typeof VENDOR_NODE_TYPE
export type MasterSchemaNodeType = typeof MASTER_SCHEMA_NODE_TYPE

/** Backend-aligned mappable ConstituentEvent targets (src/schema/mapping.ts). */
export const MAPPABLE_TARGET_FIELD_KEYS = [
  'constituentEmail',
  'firstName',
  'lastName',
  'eventType',
  'amount',
  'currency',
] as const

export type MappableTargetField = (typeof MAPPABLE_TARGET_FIELD_KEYS)[number]

export type MappingProjectStatus = 'draft' | 'validated' | 'deployed'

export type VendorFieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'unknown'

/** Supported edge transformation functions for the Properties panel. */
export const TRANSFORMATION_FUNCTIONS = [
  'uppercase',
  'lowercase',
  'trim',
  'parseDate',
  'extractDomain',
  'parseNumber',
] as const

export type TransformationFunction = (typeof TRANSFORMATION_FUNCTIONS)[number]

export type TransformationStep = {
  id: string
  function: TransformationFunction
  /** Optional parameters (e.g. date format, locale). */
  params?: Record<string, string>
}

export type VendorNodeData = {
  fieldPath: string
  valueType: VendorFieldValueType
  sampleValue: unknown
  /** True when at least one edge originates from this vendor field. */
  isConnected: boolean
}

export type MasterSchemaNodeData = {
  field: ConstituentEventFieldMeta
  /** True when at least one edge terminates at this master field. */
  isConnected: boolean
  /** Required mappable fields must be connected to be considered valid. */
  isValid: boolean
}

export type MappingEdgeData = {
  sourcePath: string
  targetField: MappableTargetField
  transformations: TransformationStep[]
}

export type VendorMappingNode = Node<VendorNodeData, VendorNodeType>
export type MasterSchemaMappingNode = Node<MasterSchemaNodeData, MasterSchemaNodeType>
export type MappingNode = VendorMappingNode | MasterSchemaMappingNode

export type MappingEdge = Edge<MappingEdgeData>

/** Full mapping configuration exported by the Mapper UI (includes transformations). */
export type ExportedFieldMapping = {
  source: string
  target: MappableTargetField
  transformations: TransformationStep[]
}

export type ExportedMappingConfiguration = {
  vendor: string
  exportedAt: string
  status: MappingProjectStatus
  mappings: ExportedFieldMapping[]
  metadataMappings: MetadataMapping[]
}

export type MappingSelection =
  | { kind: 'node'; nodeId: string }
  | { kind: 'edge'; edgeId: string }
  | null

export type MappingValidationResult =
  | { ok: true }
  | { ok: false; missingRequired: string[]; message: string }

export type MappingStoreState = {
  vendorSlug: string
  /** Human-readable vendor name stored in MappingArtifact.vendor (e.g. "GiveCampus"). */
  vendorLabel: string
  vendorPayload: Record<string, unknown>
  nodes: MappingNode[]
  edges: MappingEdge[]
  metadataMappings: MetadataMapping[]
  selection: MappingSelection
  status: MappingProjectStatus
  isDirty: boolean
  lastSyncedFingerprint: string | null
}

export type NodeMappingUpdate =
  | {
      nodeId: string
      kind: 'vendor'
      fieldPath?: string
      sampleValue?: unknown
    }
  | {
      nodeId: string
      kind: 'master'
      /** Reserved for future per-field default transforms or notes. */
      label?: string
    }

export type MappingStoreActions = {
  setVendor: (vendorSlug: string, vendorLabel: string, payload: Record<string, unknown>) => void
  setVendorPayload: (payload: Record<string, unknown>) => void
  rebuildCanvasNodes: () => void
  addNode: (node: MappingNode) => void
  removeNode: (nodeId: string) => void
  connectEdge: (connection: Connection) => void
  removeEdge: (edgeId: string) => void
  updateNodeMapping: (update: NodeMappingUpdate) => void
  updateEdgeMapping: (edgeId: string, transformations: TransformationStep[]) => void
  setMetadataMappings: (mappings: MetadataMapping[]) => void
  setSelection: (selection: MappingSelection) => void
  clearSelection: () => void
  setStatus: (status: MappingProjectStatus) => void
  markClean: (fingerprint?: string) => void
  loadFromArtifact: (artifact: MappingArtifact) => void
  exportMappingConfiguration: () => ExportedMappingConfiguration
  toMappingArtifact: () => MappingArtifact
  reset: (vendorSlug: string, vendorLabel: string, payload: Record<string, unknown>) => void
  validateMapping: () => MappingValidationResult
}

export type MappingStore = MappingStoreState & MappingStoreActions
