'use client'

import React from 'react'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    font-semibold rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95
  `

  const variantStyles = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-600',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500',
    ghost: 'bg-transparent text-purple-500 hover:bg-purple-500/10 focus:ring-purple-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg w-full',
  }

  return (
    <button
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
