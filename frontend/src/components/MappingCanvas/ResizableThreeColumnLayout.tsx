import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const DEFAULT_LEFT_PCT = 28
const DEFAULT_RIGHT_PCT = 30
const MIN_LEFT_PCT = 15
const MIN_CENTER_PCT = 25
const MIN_RIGHT_PCT = 15

type ResizableThreeColumnLayoutProps = {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

function PanelResizeHandle({ onMouseDown }: { onMouseDown: (event: React.MouseEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onMouseDown={onMouseDown}
      className="group relative z-10 flex w-3 shrink-0 cursor-col-resize items-center justify-center"
    >
      <div className="h-10 w-1 rounded-full bg-transparent transition group-hover:bg-apple-hairline group-active:bg-apple-blue-ios/40" />
    </div>
  )
}

export function ResizableThreeColumnLayout({
  left,
  center,
  right,
}: ResizableThreeColumnLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<'left' | 'right' | null>(null)
  const [leftPct, setLeftPct] = useState(DEFAULT_LEFT_PCT)
  const [rightPct, setRightPct] = useState(DEFAULT_RIGHT_PCT)
  const leftPctRef = useRef(leftPct)
  const rightPctRef = useRef(rightPct)

  leftPctRef.current = leftPct
  rightPctRef.current = rightPct

  const centerPct = 100 - leftPct - rightPct

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const container = containerRef.current
    const handle = dragHandleRef.current
    if (!container || !handle) {
      return
    }

    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) {
      return
    }

    if (handle === 'left') {
      const nextLeft = (event.clientX - rect.left) / rect.width * 100
      const maxLeft = 100 - rightPctRef.current - MIN_CENTER_PCT
      setLeftPct(Math.max(MIN_LEFT_PCT, Math.min(maxLeft, nextLeft)))
      return
    }

    const nextRight = (rect.right - event.clientX) / rect.width * 100
    const maxRight = 100 - leftPctRef.current - MIN_CENTER_PCT
    setRightPct(Math.max(MIN_RIGHT_PCT, Math.min(maxRight, nextRight)))
  }, [])

  const handleMouseUp = useCallback(() => {
    dragHandleRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const startDrag = (handle: 'left' | 'right') => (event: React.MouseEvent) => {
    event.preventDefault()
    dragHandleRef.current = handle
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 p-3">
      <div className="min-w-0 shrink-0 overflow-hidden" style={{ width: `${leftPct}%` }}>
        {left}
      </div>

      <PanelResizeHandle onMouseDown={startDrag('left')} />

      <div className="min-w-0 shrink-0 overflow-hidden" style={{ width: `${centerPct}%` }}>
        {center}
      </div>

      <PanelResizeHandle onMouseDown={startDrag('right')} />

      <div className="min-w-0 shrink-0 overflow-hidden" style={{ width: `${rightPct}%` }}>
        {right}
      </div>
    </div>
  )
}
