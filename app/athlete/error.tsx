'use client'

import { useRouter } from 'next/navigation'

export default function AthleteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
          We hit an unexpected error. Your data is safe.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/athlete/dashboard')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </main>
  )
}
