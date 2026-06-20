import type { MappingArtifact, MetadataMapping } from '../types/mapping'

const MAPPABLE_TARGETS = new Set([
  'constituentEmail',
  'firstName',
  'lastName',
  'eventType',
  'amount',
  'currency',
])

function isMetadataMapping(value: unknown): value is MetadataMapping {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const row = value as Record<string, unknown>
  return typeof row.source === 'string' && row.source.length > 0 && typeof row.key === 'string' && row.key.length > 0
}

export function parseMappingArtifactJson(raw: string):
  | { success: true; artifact: MappingArtifact }
  | { success: false; message: string } {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>

    if (typeof parsed.vendor !== 'string' || !parsed.vendor.trim()) {
      return { success: false, message: 'vendor is required' }
    }

    if (typeof parsed.exportedAt !== 'string' || !parsed.exportedAt.trim()) {
      return { success: false, message: 'exportedAt is required' }
    }

    if (!Array.isArray(parsed.mappings)) {
      return { success: false, message: 'mappings must be an array' }
    }

    for (const mapping of parsed.mappings) {
      if (
        typeof mapping !== 'object' ||
        mapping === null ||
        typeof (mapping as { source?: unknown }).source !== 'string' ||
        !MAPPABLE_TARGETS.has(String((mapping as { target?: unknown }).target))
      ) {
        return { success: false, message: 'Invalid mapping connection' }
      }
    }

    const metadataMappings = Array.isArray(parsed.metadataMappings)
      ? parsed.metadataMappings.filter(isMetadataMapping)
      : []

    return {
      success: true,
      artifact: {
        vendor: parsed.vendor.trim(),
        exportedAt: parsed.exportedAt,
        mappings: parsed.mappings as MappingArtifact['mappings'],
        metadataMappings,
      },
    }
  } catch {
    return { success: false, message: 'Invalid JSON' }
  }
}

export function parsePayloadJson(raw: string):
  | { success: true; payload: Record<string, unknown> }
  | { success: false; message: string } {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { success: false, message: 'Payload must be a JSON object' }
    }

    return { success: true, payload: parsed as Record<string, unknown> }
  } catch {
    return { success: false, message: 'Invalid JSON' }
  }
}
