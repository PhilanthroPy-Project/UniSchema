export type PayloadTreeNode = {
  key: string
  path: string
  value: unknown
  children: PayloadTreeNode[]
  isLeaf: boolean
}

export function flattenLeafPaths(nodes: PayloadTreeNode[]): string[] {
  const paths: string[] = []

  const walk = (node: PayloadTreeNode) => {
    if (node.isLeaf) {
      paths.push(node.path)
      return
    }
    node.children.forEach(walk)
  }

  nodes.forEach(walk)
  return paths
}

export function buildPayloadTree(
  payload: Record<string, unknown>,
  parentPath = '',
): PayloadTreeNode[] {
  return Object.entries(payload).map(([key, value]) => {
    const path = parentPath ? `${parentPath}.${key}` : key
    const isObject =
      typeof value === 'object' && value !== null && !Array.isArray(value)

    if (isObject) {
      return {
        key,
        path,
        value,
        isLeaf: false,
        children: buildPayloadTree(value as Record<string, unknown>, path),
      }
    }

    return {
      key,
      path,
      value,
      isLeaf: true,
      children: [],
    }
  })
}

export function getValueAtPath(
  payload: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      return (current as Record<string, unknown>)[segment]
    }
    return undefined
  }, payload)
}

export function formatPayloadValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'object') return Array.isArray(value) ? '[…]' : '{…}'
  return String(value)
}
