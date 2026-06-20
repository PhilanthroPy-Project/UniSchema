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
