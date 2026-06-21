import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { fetchMappingArtifact, syncMappingArtifact } from '../../api/syncMapping'
import { getVendorLabel, getVendorOption, type VendorOption } from '../../data/samplePayloads'
import { serializeMappingArtifact } from '../../mappingUtils'
import { getMappingsFingerprint, useMappingStore } from '../../store/useMappingStore'
import { parseMappingArtifactJson } from '../../utils/importMapping'
import { runMappingPreview } from '../../utils/previewMapping'

import { FirstRunWizard, useFirstRunWizard } from './FirstRunWizard'
import { FlowCanvas } from './FlowCanvas'
import { MainLayout } from './MainLayout'
import { MappingPreviewModal } from './MappingPreviewModal'
import { loadVendorOptions, resolveVendorOption } from './MappingToolbar'
import { RightSidebarPanel } from './RightSidebarPanel'
import { SourcePayloadPanel } from './SourcePayloadPanel'
import { TestWebhookPanel } from './TestWebhookPanel'

type ActionStatus = {
  tone: 'success' | 'error'
  message: string
} | null

type MappingCanvasProps = {
  initialVendorSlug?: string
  initialPayload?: Record<string, unknown> | null
}

type VendorOptionWithTier = VendorOption & { tier?: 1 | 2 | 3 }

export function MappingCanvas({ initialVendorSlug, initialPayload }: MappingCanvasProps) {
  const [vendorOptions, setVendorOptions] = useState<VendorOptionWithTier[]>([])
  const [selectedVendor, setSelectedVendor] = useState<VendorOptionWithTier>(() => {
    const slug = initialVendorSlug ?? 'givecampus'
    return getVendorOption(slug) ?? { slug, label: slug, samplePayload: {} }
  })
  const [customPayload, setCustomPayload] = useState<Record<string, unknown> | null>(
    initialPayload ?? null,
  )
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<ActionStatus>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingMapping, setIsLoadingMapping] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewResult, setPreviewResult] = useState<Record<string, unknown> | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [showWizard, dismissWizard] = useFirstRunWizard()

  const edges = useMappingStore((state) => state.edges)
  const metadataMappings = useMappingStore((state) => state.metadataMappings)
  const status = useMappingStore((state) => state.status)
  const isDirty = useMappingStore((state) => state.isDirty)
  const lastSyncedFingerprint = useMappingStore((state) => state.lastSyncedFingerprint)
  const setVendor = useMappingStore((state) => state.setVendor)
  const setVendorPayload = useMappingStore((state) => state.setVendorPayload)
  const loadFromArtifact = useMappingStore((state) => state.loadFromArtifact)
  const markClean = useMappingStore((state) => state.markClean)
  const toMappingArtifact = useMappingStore((state) => state.toMappingArtifact)
  const validateMapping = useMappingStore((state) => state.validateMapping)
  const setStatus = useMappingStore((state) => state.setStatus)

  const activePayload = customPayload ?? selectedVendor.samplePayload

  useEffect(() => {
    void loadVendorOptions().then(setVendorOptions)
  }, [])

  useEffect(() => {
    if (initialPayload) {
      setCustomPayload(initialPayload)
      setVendorPayload(initialPayload)
    }
  }, [initialPayload, setVendorPayload])

  useEffect(() => {
    if (initialVendorSlug) {
      const option = resolveVendorOption(initialVendorSlug, vendorOptions)
      setSelectedVendor(option)
    }
  }, [initialVendorSlug, vendorOptions])

  useEffect(() => {
    setVendor(
      selectedVendor.slug,
      selectedVendor.label,
      customPayload ?? selectedVendor.samplePayload,
    )
  }, [selectedVendor.label, selectedVendor.samplePayload, selectedVendor.slug, setVendor])

  useEffect(() => {
    let cancelled = false

    async function loadSavedMapping() {
      setIsLoadingMapping(true)
      setActionStatus(null)

      try {
        const stored = await fetchMappingArtifact(selectedVendor.label)

        if (cancelled) {
          return
        }

        if (!stored) {
          markClean(getMappingsFingerprint(useMappingStore.getState()))
          return
        }

        loadFromArtifact(stored)
        markClean()
      } catch {
        if (!cancelled) {
          setActionStatus({
            tone: 'error',
            message: 'Unable to load saved mapping configuration',
          })
          markClean(getMappingsFingerprint(useMappingStore.getState()))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMapping(false)
        }
      }
    }

    void loadSavedMapping()

    return () => {
      cancelled = true
    }
  }, [loadFromArtifact, markClean, selectedVendor.label])

  const currentFingerprint = useMemo(
    () => getMappingsFingerprint(useMappingStore.getState()),
    [edges, metadataMappings],
  )

  const hasUnsavedChanges =
    lastSyncedFingerprint === null
      ? edges.length > 0 || metadataMappings.length > 0 || isDirty
      : currentFingerprint !== lastSyncedFingerprint || isDirty

  const isCanvasSynced = lastSyncedFingerprint !== null && !hasUnsavedChanges

  const handleVendorChange = useCallback((slug: string) => {
    const option = resolveVendorOption(slug, vendorOptions)
    setSelectedVendor(option)
    setCustomPayload(null)
    setActionStatus(null)
    setStatus('draft')
  }, [setStatus, vendorOptions])

  const handleExportMapping = useCallback(() => {
    const artifact = toMappingArtifact()
    const serialized = serializeMappingArtifact(artifact)

    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${selectedVendor.slug}-mapping.json`
    anchor.click()
    URL.revokeObjectURL(url)

    setActionStatus({
      tone: 'success',
      message: `${artifact.mappings.length} mapping(s) exported`,
    })
  }, [selectedVendor.slug, toMappingArtifact])

  const handleImportMapping = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'

    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        return
      }

      void file.text().then((text) => {
        const parsed = parseMappingArtifactJson(text)

        if (!parsed.success) {
          setActionStatus({ tone: 'error', message: parsed.message })
          return
        }

        loadFromArtifact(parsed.artifact)
        setStatus('draft')
        setActionStatus({
          tone: 'success',
          message: `Imported ${parsed.artifact.mappings.length} mapping(s)`,
        })
      })
    }

    input.click()
  }, [loadFromArtifact, setStatus])

  const handleValidateMapping = useCallback(() => {
    const result = validateMapping()

    if (result.ok) {
      setActionStatus({
        tone: 'success',
        message: 'Mapping validation passed — all required fields are connected',
      })
      return
    }

    setActionStatus({
      tone: 'error',
      message: result.message,
    })
  }, [validateMapping])

  const handlePreviewData = useCallback(async () => {
    const artifact = toMappingArtifact()
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewResult(null)
    setPreviewError(null)

    const result = await runMappingPreview(artifact, activePayload)
    setPreviewLoading(false)

    if (result.ok) {
      setPreviewResult(result.event)
    } else {
      setPreviewError(result.message)
    }
  }, [activePayload, toMappingArtifact])

  const handleDeploy = useCallback(async () => {
    const validation = validateMapping()

    if (!validation.ok && edges.length > 0) {
      setActionStatus({
        tone: 'error',
        message: validation.message,
      })
      return
    }

    const artifact = toMappingArtifact()

    setIsSyncing(true)
    setActionStatus(null)

    try {
      const result = await syncMappingArtifact(artifact)

      if (!result.success) {
        const isUnauthorized =
          result.message.toLowerCase().includes('unauthorized') ||
          result.message.toLowerCase().includes('401')

        setActionStatus({
          tone: 'error',
          message: isUnauthorized
            ? 'Deploy unauthorized — set your mapping sync token (see admin guide)'
            : result.message,
        })
        return
      }

      markClean(currentFingerprint)
      setStatus('deployed')
      setActionStatus({
        tone: 'success',
        message: `${result.mappingCount} mapping(s) deployed to engine`,
      })
    } catch {
      setActionStatus({
        tone: 'error',
        message: 'Unable to reach the sync engine. Is the backend running?',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [currentFingerprint, edges.length, markClean, setStatus, toMappingArtifact, validateMapping])

  const handlePayloadChange = useCallback(
    (payload: Record<string, unknown>) => {
      setCustomPayload(payload)
      setVendorPayload(payload)
      setStatus('draft')
    },
    [setStatus, setVendorPayload],
  )

  return (
    <div className="relative flex h-full flex-col">
      <MainLayout
        vendorOptions={vendorOptions.length > 0 ? vendorOptions : [selectedVendor]}
        selectedVendorSlug={selectedVendor.slug}
        status={status}
        isDirty={hasUnsavedChanges}
        isSynced={isCanvasSynced}
        isSyncing={isSyncing}
        isDeployDisabled={
          (edges.length === 0 && metadataMappings.length === 0) || !hasUnsavedChanges
        }
        actionStatus={actionStatus}
        onVendorChange={handleVendorChange}
        onValidate={handleValidateMapping}
        onPreview={() => void handlePreviewData()}
        onDeploy={() => void handleDeploy()}
        onImport={handleImportMapping}
        onExport={handleExportMapping}
        leftPanel={
          <>
            <SourcePayloadPanel
              vendor={getVendorLabel(selectedVendor.slug)}
              payload={activePayload}
              highlightedPath={highlightedPath}
              onPayloadChange={handlePayloadChange}
            />
            <TestWebhookPanel vendorSlug={selectedVendor.slug} payload={activePayload} />
          </>
        }
        centerPanel={
          <div className="relative min-h-0 flex-1 bg-zinc-950">
            {isLoadingMapping ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading saved mapping…
              </div>
            ) : (
              <FlowCanvas
                onActiveSourcePathChange={setHighlightedPath}
                readOnly={status === 'deployed' && isCanvasSynced}
              />
            )}
          </div>
        }
        rightPanel={<RightSidebarPanel />}
      />

      <MappingPreviewModal
        open={previewOpen}
        loading={previewLoading}
        result={previewResult}
        error={previewError}
        onClose={() => setPreviewOpen(false)}
      />

      {showWizard && (
        <FirstRunWizard vendorLabel={selectedVendor.label} onDismiss={dismissWizard} />
      )}
    </div>
  )
}

export default MappingCanvas
