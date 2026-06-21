import type { Connection, Edge, Node } from 'reactflow'

import {
  MASTER_SCHEMA_NODE_TYPE,
  VENDOR_NODE_TYPE,
} from '../store/mappingStoreTypes'
import type { ConstituentEventFieldKey } from '../types/constituentEvent'
import { CONSTITUENT_EVENT_FIELD_KEYS } from '../types/constituentEvent'

/** @deprecated Legacy node type — prefer VENDOR_NODE_TYPE */
export const SOURCE_FIELD_NODE_TYPE = 'sourceField' as const
/** @deprecated Legacy node type — prefer MASTER_SCHEMA_NODE_TYPE */
export const TARGET_FIELD_NODE_TYPE = 'targetField' as const

export function isVendorToMasterConnection(
  connection: Connection,
  nodes: Node[],
): boolean {
  if (!connection.source || !connection.target) {
    return false
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  if (!sourceNode || !targetNode) {
    return false
  }

  return (
    sourceNode.type === VENDOR_NODE_TYPE &&
    targetNode.type === MASTER_SCHEMA_NODE_TYPE
  )
}

export function isSourceToTargetConnection(
  connection: Connection,
  nodes: Node[],
): boolean {
  if (!connection.source || !connection.target) {
    return false
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  if (!sourceNode || !targetNode) {
    return false
  }

  if (isVendorToMasterConnection(connection, nodes)) {
    return true
  }

  return (
    sourceNode.type === SOURCE_FIELD_NODE_TYPE &&
    targetNode.type === TARGET_FIELD_NODE_TYPE
  )
}

export function dedupeTargetEdges(
  edges: Edge[],
  connection: Connection,
): Edge[] {
  if (!connection.target || !connection.targetHandle) {
    return edges
  }

  return edges.filter(
    (edge) =>
      !(
        edge.target === connection.target &&
        edge.targetHandle === connection.targetHandle
      ),
  )
}

export function isConstituentEventFieldKey(
  value: string | null | undefined,
): value is ConstituentEventFieldKey {
  if (!value) {
    return false
  }

  return CONSTITUENT_EVENT_FIELD_KEYS.includes(value as ConstituentEventFieldKey)
}
