'use client'

import React from 'react'
import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'elevated' | 'outlined'
  interactive?: boolean
}

export function Card({
  children,
  className,
  onClick,
  variant = 'default',
  interactive = false,
}: CardProps) {
  const baseStyles = 'rounded-2xl p-5 transition-all duration-200'

  const variantStyles = {
    default: 'bg-slate-800 border border-slate-700',
    elevated: 'bg-slate-800 border border-slate-700 shadow-lg',
    outlined: 'bg-transparent border-2 border-slate-700',
  }

  const interactiveStyles = interactive
    ? 'hover:border-green-500/50 hover:bg-slate-700 cursor-pointer active:scale-95'
    : ''

  return (
    <div
      className={clsx(baseStyles, variantStyles[variant], interactiveStyles, className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={className}>{children}</div>
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx('mt-4 pt-4 border-t border-slate-700', className)}>
      {children}
    </div>
  )
}
