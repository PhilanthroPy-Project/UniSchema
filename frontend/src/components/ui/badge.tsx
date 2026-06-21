import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'muted'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-apple-blue-ios/10 text-apple-blue-ios',
  success: 'border-transparent bg-apple-green/10 text-apple-green',
  warning: 'border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400',
  destructive: 'border-transparent bg-apple-red/10 text-apple-red',
  outline: 'border-theme-hairline bg-transparent text-theme-ink',
  muted: 'border-transparent bg-theme-inset text-theme-muted',
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
