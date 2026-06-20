import { previewMappingArtifact } from '../api/syncMapping'
import type { MappingArtifact } from '../types/mapping'

export type PreviewResult =
  | { ok: true; event: Record<string, unknown> }
  | { ok: false; message: string }

export async function runMappingPreview(
  artifact: MappingArtifact,
  samplePayload: Record<string, unknown>,
): Promise<PreviewResult> {
  try {
    const event = await previewMappingArtifact(artifact, samplePayload)
    return { ok: true, event }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Preview failed',
    }
  }
}
