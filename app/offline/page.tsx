'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚡</div>
        <h1 className="text-3xl font-bold text-white mb-4">You&apos;re Offline</h1>
        <p className="text-slate-400 mb-8">
          It looks like you&apos;ve lost your internet connection. Fuel Different requires an active connection to sync your nutrition data.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
