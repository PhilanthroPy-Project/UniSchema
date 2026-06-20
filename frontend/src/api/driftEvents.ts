import { buildAuthHeaders } from '../utils/syncToken'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type DriftValidationErrors = {
  formErrors: string[]
  fieldErrors: Record<string, string[]>
}

export type DriftEventSummary = {
  id: string
  vendor: string
  capturedAt: string
  status: string
  validationErrors: DriftValidationErrors
  mapperKind: string
  localFixturePath?: string | null
}

export async function fetchDriftEvents(
  status: 'pending' | 'processed' = 'pending',
  vendor?: string,
): Promise<DriftEventSummary[]> {
  const params = new URLSearchParams({ status })
  if (vendor) {
    params.set('vendor', vendor)
  }

  const response = await fetch(`${API_BASE}/drift/events?${params.toString()}`, {
    headers: buildAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to load drift events (${response.status})`)
  }

  const body = (await response.json()) as {
    success: boolean
    events: DriftEventSummary[]
  }

  return body.events
}

export async function fetchVendors(): Promise<
  Array<{ slug: string; label: string; webhookPath: string; hasSample: boolean }>
> {
  const response = await fetch(`${API_BASE}/vendors`)

  if (!response.ok) {
    throw new Error(`Failed to load vendors (${response.status})`)
  }

  const body = (await response.json()) as {
    success: boolean
    vendors: Array<{ slug: string; label: string; webhookPath: string; hasSample: boolean }>
  }

  return body.vendors
}
