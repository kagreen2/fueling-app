'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed as standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    if (standalone) return // Don't show if already installed

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) return // Don't show for 7 days after dismissal
    }

    // For Android/Chrome - listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS - show manual instructions after a short delay
    if (ios) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  if (!showPrompt || isStandalone) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl shadow-purple-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-icon-192-PocscrgojEbdJSVNv8Eyxf.png"
              alt="Fuel Different"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Install Fuel Different</h3>
            {isIOS ? (
              <p className="text-slate-400 text-xs mt-1">
                Tap the <span className="inline-flex items-center"><svg className="w-4 h-4 inline text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></span> Share button, then <strong className="text-white">&quot;Add to Home Screen&quot;</strong> to install this app.
              </p>
            ) : (
              <p className="text-slate-400 text-xs mt-1">
                Add to your home screen for quick access and a native app experience.
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Install App
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
