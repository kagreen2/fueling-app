'use client'

import { useEffect } from 'react'

/**
 * ErrorReporter — catches unhandled errors and promise rejections
 * and reports them to /api/error-report for logging and alerting.
 *
 * Drop this into your root layout to enable automatic error reporting.
 * Replace with Sentry when ready to scale.
 */
export function ErrorReporter() {
  useEffect(() => {
    function reportError(data: Record<string, any>) {
      try {
        // Use sendBeacon for reliability (fires even during page unload)
        const payload = JSON.stringify({
          ...data,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        })

        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/error-report', new Blob([payload], { type: 'application/json' }))
        } else {
          fetch('/api/error-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // Silently fail — don't cause more errors
      }
    }

    function handleError(event: ErrorEvent) {
      reportError({
        type: 'unhandled_error',
        message: event.message,
        stack: event.error?.stack,
      })
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      reportError({
        type: 'unhandled_rejection',
        message: reason?.message || String(reason),
        stack: reason?.stack,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
