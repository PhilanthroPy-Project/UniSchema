import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const WIZARD_STORAGE_KEY = 'unischema-wizard-dismissed'

type FirstRunWizardProps = {
  vendorLabel: string
  onDismiss: () => void
}

export function FirstRunWizard({ vendorLabel, onDismiss }: FirstRunWizardProps) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'Pick your vendor',
      body: `You are mapping ${vendorLabel}. Tier 3 vendors require verification with your real payloads before production.`,
    },
    {
      title: 'Map required fields',
      body: 'Connect source fields to constituentEmail and eventType at minimum. Use metadata mappings for extra vendor fields.',
    },
    {
      title: 'Test and sync',
      body: 'Use Test to preview, Send test webhook to verify end-to-end ingest, then Sync to Engine to save.',
    },
  ]

  const current = steps[step]!

  const finish = () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, '1')
    onDismiss()
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-theme-surface p-6 shadow-xl"
        data-testid="first-run-wizard"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-theme-muted">
              Step {step + 1} of {steps.length}
            </p>
            <h3 className="text-lg font-semibold text-theme-ink">{current.title}</h3>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-full p-1 text-theme-muted hover:bg-theme-inset"
            aria-label="Dismiss wizard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-theme-muted">{current.body}</p>
        <div className="mt-6 flex justify-end gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((value) => value - 1)}
              className="rounded-full px-4 py-2 text-sm text-theme-muted hover:bg-theme-inset"
            >
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((value) => value + 1)}
              className="rounded-full bg-apple-blue-focus px-4 py-2 text-sm font-medium text-white"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-full bg-apple-blue-focus px-4 py-2 text-sm font-medium text-white"
            >
              Get started
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function useFirstRunWizard(): [boolean, () => void] {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(sessionStorage.getItem(WIZARD_STORAGE_KEY) !== '1')
  }, [])

  return [visible, () => setVisible(false)]
}
