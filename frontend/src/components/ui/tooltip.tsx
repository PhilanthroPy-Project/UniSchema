import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 max-w-[220px] rounded-lg border border-theme-hairline bg-theme-elevated px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal text-theme-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'left-1/2 top-full mt-2 -translate-x-1/2',
        )}
      >
        {content}
      </span>
    </span>
  )
}
