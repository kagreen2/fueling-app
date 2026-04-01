'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkExistingSubscription()
    }
  }, [])

  async function checkExistingSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
      // Show banner if not subscribed and hasn't been dismissed recently
      if (!sub) {
        const dismissed = localStorage.getItem('push-banner-dismissed')
        if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
          // Show after a short delay so it doesn't feel intrusive
          setTimeout(() => setShowBanner(true), 3000)
        }
      }
    } catch (error) {
      console.error('Error checking push subscription:', error)
    }
  }

  async function subscribeToPush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      setSubscription(sub)

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setShowBanner(false)
    } catch (error) {
      console.error('Error subscribing to push:', error)
      // If permission was denied, don't show banner again for a while
      if (Notification.permission === 'denied') {
        localStorage.setItem('push-banner-dismissed', Date.now().toString())
      }
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribeFromPush() {
    setLoading(true)
    try {
      await subscription?.unsubscribe()
      setSubscription(null)

      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
    } finally {
      setLoading(false)
    }
  }

  function dismissBanner() {
    setShowBanner(false)
    localStorage.setItem('push-banner-dismissed', Date.now().toString())
  }

  if (!isSupported) return null

  // Floating opt-in banner (shown when not subscribed)
  if (showBanner && !subscription) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-800 border border-purple-500/30 rounded-2xl p-4 shadow-xl shadow-purple-900/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">🔔</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                Never miss a meal log
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Get fun reminders to check in and log your meals. We promise they won't be boring.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={subscribeToPush}
                  disabled={loading}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enabling...' : 'Turn On'}
                </button>
                <button
                  onClick={dismissBanner}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-full transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Separate component for the settings page toggle
export function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [])

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  async function togglePush() {
    setLoading(true)
    try {
      if (subscription) {
        // Unsubscribe
        await subscription.unsubscribe()
        setSubscription(null)
        await fetch('/api/notifications/unsubscribe', { method: 'POST' })
      } else {
        // Subscribe
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        })
        setSubscription(sub)
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
      }
    } catch (error) {
      console.error('Error toggling push:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-slate-300">Push Notifications</p>
          <p className="text-xs text-slate-500">Not supported in this browser</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-slate-300">Push Notifications</p>
        <p className="text-xs text-slate-500">
          {subscription ? 'Receiving meal & check-in reminders' : 'Get fun reminders to stay on track'}
        </p>
      </div>
      <button
        onClick={togglePush}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          subscription ? 'bg-purple-600' : 'bg-slate-600'
        } ${loading ? 'opacity-50' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            subscription ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
