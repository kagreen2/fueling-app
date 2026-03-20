import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Fuel Different
          </h1>
          <p className="text-zinc-400 text-lg">
            Performance fueling for serious athletes
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/login"
            className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold py-4 px-6 rounded-xl text-lg transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors border border-zinc-700"
          >
            Sign In
          </Link>
        </div>

        <p className="text-zinc-600 text-sm mt-8">
          Built for athletes. Powered by AI.
        </p>
      </div>
    </main>
  )
}