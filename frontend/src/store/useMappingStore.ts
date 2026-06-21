import { create } from 'zustand'

import type { MappingArtifact, MetadataMapping } from '../types/mapping'
import {
  addNode as addNodePure,
  connectEdge as connectEdgePure,
  createInitialMappingState,
  exportMappingConfiguration as exportMappingConfigurationPure,
  getMappingsFingerprint,
  loadFromArtifact as loadFromArtifactPure,
  rebuildCanvasNodes as rebuildCanvasNodesPure,
  removeEdge as removeEdgePure,
  removeNode as removeNodePure,
  setMetadataMappingsPure,
  setVendorPayload as setVendorPayloadPure,
  toMappingArtifact as toMappingArtifactPure,
  updateEdgeMapping as updateEdgeMappingPure,
  updateNodeMapping as updateNodeMappingPure,
  validateMappingState,
} from './mappingStorePure'
import type {
  MappingNode,
  MappingProjectStatus,
  MappingSelection,
  MappingStore,
  NodeMappingUpdate,
  TransformationStep,
} from './mappingStoreTypes'

export type {
  ExportedFieldMapping,
  ExportedMappingConfiguration,
  MappingEdge,
  MappingEdgeData,
  MappingNode,
  MappingProjectStatus,
  MappingSelection,
  MappingStore,
  MappingStoreState,
  MappingValidationResult,
  MasterSchemaNodeData,
  MasterSchemaNodeType,
  MappableTargetField,
  NodeMappingUpdate,
  TransformationFunction,
  TransformationStep,
  VendorNodeData,
  VendorNodeType,
} from './mappingStoreTypes'

export {
  MASTER_SCHEMA_NODE_TYPE,
  MAPPABLE_TARGET_FIELD_KEYS,
  TRANSFORMATION_FUNCTIONS,
  VENDOR_NODE_TYPE,
} from './mappingStoreTypes'

export {
  createInitialMappingState,
  getMappingsFingerprint,
  inferVendorFieldType,
  mappingEdgeId,
  masterNodeId,
  vendorNodeId,
} from './mappingStorePure'

export const useMappingStore = create<MappingStore>()((set, get) => ({
  ...createInitialMappingState('givecampus', 'GiveCampus', {}),

  setVendor: (vendorSlug, vendorLabel, payload) => {
    set((state) =>
      rebuildCanvasNodesPure({
        ...state,
        vendorSlug,
        vendorLabel,
        vendorPayload: payload,
        edges: [],
        metadataMappings: [],
        selection: null,
        status: 'draft',
        isDirty: true,
        lastSyncedFingerprint: null,
      }),
    )
  },

  setVendorPayload: (payload) => {
    set((state) => setVendorPayloadPure(state, payload))
  },

  rebuildCanvasNodes: () => {
    set((state) => rebuildCanvasNodesPure(state))
  },

  addNode: (node: MappingNode) => {
    set((state) => addNodePure(state, node))
  },

  removeNode: (nodeId: string) => {
    set((state) => removeNodePure(state, nodeId))
  },

  connectEdge: (connection) => {
    set((state) => connectEdgePure(state, connection))
  },

  removeEdge: (edgeId: string) => {
    set((state) => removeEdgePure(state, edgeId))
  },

  updateNodeMapping: (update: NodeMappingUpdate) => {
    set((state) => updateNodeMappingPure(state, update))
  },

  updateEdgeMapping: (edgeId: string, transformations: TransformationStep[]) => {
    set((state) => updateEdgeMappingPure(state, edgeId, transformations))
  },

  setMetadataMappings: (mappings: MetadataMapping[]) => {
    set((state) => setMetadataMappingsPure(state, mappings))
  },

  setSelection: (selection: MappingSelection) => {
    set({ selection })
  },

  clearSelection: () => {
    set({ selection: null })
  },

  setStatus: (status: MappingProjectStatus) => {
    set({ status, isDirty: true })
  },

  markClean: (fingerprint?: string) => {
    set((state) => ({
      isDirty: false,
      lastSyncedFingerprint: fingerprint ?? getMappingsFingerprint(state),
    }))
  },

  loadFromArtifact: (artifact: MappingArtifact) => {
    set((state) => loadFromArtifactPure(state, artifact))
  },

  exportMappingConfiguration: () => exportMappingConfigurationPure(get()),

  toMappingArtifact: () => toMappingArtifactPure(get()),

  reset: (vendorSlug, vendorLabel, payload) => {
    set(createInitialMappingState(vendorSlug, vendorLabel, payload))
  },

  validateMapping: () => {
    const result = validateMappingState(get())

    if (result.ok) {
      set({ status: 'validated' })
    }

    return result
  },
}))
