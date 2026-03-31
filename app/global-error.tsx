'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            An unexpected error occurred. Your data is safe — try reloading the page.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
