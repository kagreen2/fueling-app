'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

type Mode = 'fix_macros' | 'grocery_list' | 'question'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: Mode
  timestamp: Date
  saved?: boolean
}

interface SavedItem {
  id: string
  content: string
  mode: Mode
  savedAt: Date
}

interface MacroContext {
  remaining: { calories: number; protein: number; carbs: number; fat: number }
  consumed: { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  mealsLoggedCount: number
}

const MODE_CONFIG = {
  fix_macros: {
    icon: '🎯',
    label: 'Fix My Macros',
    description: 'Get meal suggestions to hit your remaining targets',
    placeholder: 'e.g. "I\'m high on fat, what should I eat?" or "I have chicken and rice, what else do I need?"',
    color: 'purple',
  },
  grocery_list: {
    icon: '🛒',
    label: 'Grocery List',
    description: 'Build a smart grocery list for the week',
    placeholder: 'e.g. "Build me a list for this week" or "I\'m on a budget, keep it under $80"',
    color: 'green',
  },
  question: {
    icon: '💬',
    label: 'Ask Anything',
    description: 'Get personalized nutrition answers',
    placeholder: 'e.g. "Should I eat before morning practice?" or "How much water should I drink?"',
    color: 'blue',
  },
} as const

export default function MealAssistantPage() {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [loading, setLoading] = useState(true)
  const [activeMode, setActiveMode] = useState<Mode | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [macroContext, setMacroContext] = useState<MacroContext | null>(null)
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('fuel-meal-assistant-saved')
        return stored ? JSON.parse(stored) : []
      } catch { return [] }
    }
    return []
  })
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: athlete } = await supabase.from('athletes').select('id').eq('profile_id', user.id).single()
    if (!athlete) { router.push('/athlete/onboarding'); return }
    setLoading(false)
  }

  function toggleSave(msgId: string, content: string) {
    const existing = savedItems.find(s => s.id === msgId)
    let updated: SavedItem[]
    if (existing) {
      updated = savedItems.filter(s => s.id !== msgId)
    } else {
      updated = [...savedItems, { id: msgId, content, mode: activeMode!, savedAt: new Date() }]
    }
    setSavedItems(updated)
    localStorage.setItem('fuel-meal-assistant-saved', JSON.stringify(updated))
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saved: !m.saved } : m))
  }

  function deleteSaved(id: string) {
    const updated = savedItems.filter(s => s.id !== id)
    setSavedItems(updated)
    localStorage.setItem('fuel-meal-assistant-saved', JSON.stringify(updated))
  }

  function selectMode(mode: Mode) {
    setActiveMode(mode)
    setMessages([])
    setMacroContext(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function sendMessage(customMessage?: string) {
    const text = customMessage || input.trim()
    if (!text || !activeMode || sending) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      mode: activeMode,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/meal-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          message: text,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      if (data.context) {
        setMacroContext(data.context)
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I had trouble with that. ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    }

    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-slate-400">Loading Meal Assistant...</p>
        </div>
      </main>
    )
  }

  // Mode selection screen
  if (!activeMode) {
    return (
      <main className="min-h-screen bg-slate-900 text-white pb-20">
        <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => router.push('/athlete/dashboard')} className="text-slate-400 hover:text-white transition-colors">← Back</button>
            <div>
              <h1 className="text-lg font-bold text-white">Meal Assistant</h1>
              <p className="text-xs text-slate-400">Your AI nutrition coach</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">How can I help?</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              I know your macro targets and what you've eaten today. Pick a mode and let's get you fueled right.
            </p>
          </div>

          <div className="space-y-4">
            {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([mode, config]) => (
              <button
                key={mode}
                onClick={() => selectMode(mode)}
                className="w-full text-left bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-500/40 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-2xl shrink-0 group-hover:bg-purple-500/20 transition-colors">
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-0.5">{config.label}</h3>
                    <p className="text-sm text-slate-400">{config.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-500 group-hover:text-purple-400 mt-1 ml-auto shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Saved Items */}
          {savedItems.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-medium mb-3 hover:text-purple-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                Saved ({savedItems.length})
                <svg className={`w-3 h-3 transition-transform ${showSaved ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showSaved && (
                <div className="space-y-2 mb-6">
                  {savedItems.map((item) => (
                    <div key={item.id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs">{MODE_CONFIG[item.mode].icon}</span>
                          <span className="text-[10px] text-purple-400 font-medium">{MODE_CONFIG[item.mode].label}</span>
                          <span className="text-[10px] text-slate-500">{new Date(item.savedAt).toLocaleDateString()}</span>
                        </div>
                        <button onClick={() => deleteSaved(item.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Remove">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-3 whitespace-pre-wrap">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick prompts */}
          <div className="mt-10">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Quick Prompts</p>
            <div className="flex flex-wrap gap-2">
              {[
                { text: "What should I eat next?", mode: 'fix_macros' as Mode },
                { text: "I'm high on fat today", mode: 'fix_macros' as Mode },
                { text: "Build me a grocery list", mode: 'grocery_list' as Mode },
                { text: "Should I eat before practice?", mode: 'question' as Mode },
                { text: "How much protein do I really need?", mode: 'question' as Mode },
                { text: "Give me a 3-day meal prep plan", mode: 'grocery_list' as Mode },
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => { selectMode(prompt.mode); setTimeout(() => sendMessage(prompt.text), 200) }}
                  className="text-xs bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white hover:border-purple-500/30 px-3 py-1.5 rounded-full transition-all"
                >
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  const currentConfig = MODE_CONFIG[activeMode]

  // Chat interface
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveMode(null)} className="text-slate-400 hover:text-white transition-colors">← Back</button>
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentConfig.icon}</span>
              <div>
                <h1 className="text-sm font-bold text-white">{currentConfig.label}</h1>
                <p className="text-[10px] text-slate-400">{currentConfig.description}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setMessages([]); setMacroContext(null) }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-all"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Macro Context Bar */}
      {macroContext && (
        <div className="bg-slate-800/60 border-b border-slate-700/40">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center gap-4 overflow-x-auto text-xs">
            <span className="text-slate-500 shrink-0">Remaining:</span>
            <span className="text-purple-400 font-medium shrink-0">{macroContext.remaining.calories} cal</span>
            <span className="text-blue-400 font-medium shrink-0">{macroContext.remaining.protein}g P</span>
            <span className="text-amber-400 font-medium shrink-0">{macroContext.remaining.carbs}g C</span>
            <span className="text-red-400 font-medium shrink-0">{macroContext.remaining.fat}g F</span>
            <span className="text-slate-500 shrink-0">({macroContext.mealsLoggedCount} meals logged)</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl block mb-3">{currentConfig.icon}</span>
              <p className="text-slate-400 text-sm">Send a message to get started</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {activeMode === 'fix_macros' && [
                  "What should I eat next?",
                  "I'm high on fat, low on protein",
                  "Make me a snack under 200 cal",
                  "I have chicken and veggies, what else?",
                ].map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)} className="text-xs bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white hover:border-purple-500/30 px-3 py-1.5 rounded-full transition-all">{q}</button>
                ))}
                {activeMode === 'grocery_list' && [
                  "Build me a weekly grocery list",
                  "Budget-friendly list under $80",
                  "High protein meal prep list",
                  "Give me a 3-day meal prep plan with grocery list",
                  "I'm vegetarian, help me plan",
                ].map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)} className="text-xs bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white hover:border-purple-500/30 px-3 py-1.5 rounded-full transition-all">{q}</button>
                ))}
                {activeMode === 'question' && [
                  "Should I eat before morning practice?",
                  "How much water should I drink?",
                  "Is creatine safe for me?",
                  "What's the best post-workout meal?",
                ].map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)} className="text-xs bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white hover:border-purple-500/30 px-3 py-1.5 rounded-full transition-all">{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-purple-600/30 border border-purple-500/30' : 'bg-slate-800/60 border border-slate-700/40'} rounded-2xl px-4 py-3`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs">🤖</span>
                    <span className="text-[10px] text-purple-400 font-medium">Meal Assistant</span>
                  </div>
                )}
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-slate-200'}`}>
                  {msg.content}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-slate-500">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => toggleSave(msg.id, msg.content)}
                      className={`text-[10px] flex items-center gap-1 transition-colors ${msg.saved || savedItems.some(s => s.id === msg.id) ? 'text-purple-400' : 'text-slate-500 hover:text-purple-400'}`}
                      title={msg.saved || savedItems.some(s => s.id === msg.id) ? 'Unsave' : 'Save'}
                    >
                      <svg className="w-3 h-3" fill={msg.saved || savedItems.some(s => s.id === msg.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      {msg.saved || savedItems.some(s => s.id === msg.id) ? 'Saved' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs">🤖</span>
                  <span className="text-[10px] text-purple-400 font-medium">Meal Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentConfig.placeholder}
                rows={1}
                className="w-full bg-transparent text-white text-sm px-4 py-3 resize-none focus:outline-none placeholder-slate-500"
                style={{ maxHeight: '120px' }}
              />
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 h-11 w-11 p-0 rounded-xl shrink-0 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 text-center">
            AI suggestions are for informational purposes. Always consult your coach or a healthcare professional for medical advice.
          </p>
        </div>
      </div>
    </main>
  )
}
