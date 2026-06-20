import type { MappingArtifact } from '../types/mapping'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type MappingSyncSuccess = {
  success: true
  vendor: string
  mappingCount: number
  syncedAt: string
}

export type MappingSyncFailure = {
  success: false
  message: string
  errors?: {
    formErrors: string[]
    fieldErrors: Record<string, string[]>
  }
}

export type MappingSyncResult = MappingSyncSuccess | MappingSyncFailure

export type StoredMappingArtifact = MappingArtifact & {
  syncedAt: string
}

export async function fetchMappingArtifact(
  vendor: string,
): Promise<StoredMappingArtifact | null> {
  const response = await fetch(
    `${API_BASE}/mappings/${encodeURIComponent(vendor.toLowerCase())}`,
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to load mapping configuration')
  }

  const body = (await response.json()) as {
    success: boolean
    mapping: StoredMappingArtifact
  }

  return body.mapping
}

export async function syncMappingArtifact(
  artifact: MappingArtifact,
): Promise<MappingSyncResult> {
  const response = await fetch(`${API_BASE}/mappings/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(artifact),
  })

  const body = (await response.json()) as MappingSyncResult

  if (!response.ok) {
    return {
      success: false,
      message: body.success === false ? body.message : 'Sync request failed',
      errors: body.success === false ? body.errors : undefined,
    }
  }

  return body
}
