import type { Edge } from 'reactflow'

const REQUIRED_TARGETS = ['constituentEmail', 'eventType'] as const

export function getMissingRequiredMappings(edges: Edge[]): string[] {
  const connected = new Set(
    edges
      .map((edge) => edge.targetHandle)
      .filter((handle): handle is string => Boolean(handle)),
  )

  return REQUIRED_TARGETS.filter((target) => !connected.has(target))
}

export function validateRequiredMappings(edges: Edge[]): { ok: true } | { ok: false; missing: string[] } {
  const missing = getMissingRequiredMappings(edges)

  if (missing.length === 0) {
    return { ok: true }
  }

  return { ok: false, missing: [...missing] }
}
