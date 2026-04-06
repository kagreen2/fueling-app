'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

const COACHES_HERO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/coaches-hero-5Dv7oNygnMPD7vStbvcB7D.webp'
const CLIENT_DASH = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/client-dashboard-view-DM6BwjHJErcHBujcKGjCvL.webp'
const BODY_COMP = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/body-comp-tracking-KUjG9mw7t3p63uUtb7z9LT.webp'
const FUEL_SCORE_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-score-dashboard-d7aLb2Rk48NJHjiiYroNah.webp'

function LightningBolt({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4.09 12.63C3.74 13.05 3.56 13.26 3.56 13.5C3.56 13.7 3.65 13.89 3.82 14.01C3.99 14.13 4.25 14.13 4.77 14.13H12L11 22L19.91 11.37C20.26 10.95 20.44 10.74 20.44 10.5C20.44 10.3 20.35 10.11 20.18 9.99C20.01 9.87 19.75 9.87 19.23 9.87H12L13 2Z" fill="#22C55E" stroke="#22C55E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function GymsPage() {
  const router = useRouter()

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-slate-900/85 backdrop-blur-lg border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LightningBolt className="w-7 h-7" />
            <span className="text-xl font-bold text-white tracking-tight">Fuel Different</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/teams" className="text-slate-400 hover:text-white transition-colors">For Teams</Link>
            <span className="text-purple-400 font-medium">For Gyms & Trainers</span>
            <button onClick={() => scrollToSection('meal-tracking')} className="text-slate-400 hover:text-white transition-colors">Meal Tracking</button>
            <button onClick={() => scrollToSection('body-comp')} className="text-slate-400 hover:text-white transition-colors">Body Comp</button>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-24 px-4">
        <div className="absolute inset-0 z-0">
          <img src={COACHES_HERO} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/60 to-slate-900" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-6">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">For Nutrition Coaches, Trainers & Gyms</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[0.95] tracking-tight mb-6">
              <span className="text-white">See the</span>
              <br />
              <span className="text-purple-400">Full Picture</span>
              <br />
              <span className="text-white">of Every Client</span>
            </h1>

            <p className="text-lg text-slate-400 max-w-xl leading-relaxed mb-8">
              Stop guessing what your clients do between sessions. Track their nutrition, monitor their wellness, and watch their body composition change — all in one platform.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/signup')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-base px-8 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/30"
              >
                Start Coaching Smarter &rarr;
              </button>
              <button
                onClick={() => scrollToSection('meal-tracking')}
                className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 font-semibold text-base px-8 py-3 rounded-xl transition-all"
              >
                See How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            You Only See Your Clients for <span className="text-purple-400">an Hour a Week</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
            What happens the other 167 hours? Are they eating right? Sleeping enough? Stressed out? You have no idea — until they show up and the scale hasn&apos;t moved.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                ),
                title: 'No Nutrition Visibility',
                desc: 'Clients say they\'re eating well, but you can\'t verify it. Meal plans go unfollowed and you don\'t know until it\'s too late.',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                ),
                title: 'Lifestyle Blind Spots',
                desc: 'Stress, sleep, and recovery directly impact results. But you only hear about it when something goes wrong.',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                ),
                title: 'Slow Feedback Loops',
                desc: 'Body comp changes take weeks to show. Without daily data, you\'re coaching in the dark between scans.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Meal Tracking */}
      <section id="meal-tracking" className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-xs text-purple-400 font-medium">AI-Powered</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Snap a Photo.<br /><span className="text-purple-400">Get the Macros.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Your clients take a photo of their meal and AI breaks it down instantly — calories, protein, carbs, and fats. No more food diaries they never fill out. No more guessing portion sizes.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Photo → Macros in Seconds', desc: 'AI identifies the food and estimates portions automatically' },
                  { title: 'Daily Compliance Tracking', desc: 'See who\'s logging and who\'s ghosting — at a glance' },
                  { title: 'Meal History Review', desc: 'Scroll through a client\'s actual meals before your next session' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center mt-0.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meal log mockup */}
            <div className="relative">
              <div className="absolute -inset-4 bg-purple-500/5 rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Today&apos;s Meals</p>
                    <p className="text-2xl font-bold text-white">3 logged</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Calories</p>
                    <p className="text-xl font-bold text-purple-400">1,840 / 2,200</p>
                  </div>
                </div>
                {[
                  { time: '8:15 AM', meal: 'Breakfast', cal: 520, protein: '32g', img: '🥣' },
                  { time: '12:30 PM', meal: 'Lunch', cal: 680, protein: '45g', img: '🥗' },
                  { time: '6:45 PM', meal: 'Dinner', cal: 640, protein: '38g', img: '🍗' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-t border-slate-700/40">
                    <div className="text-2xl">{m.img}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{m.meal}</p>
                      <p className="text-xs text-slate-500">{m.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{m.cal} cal</p>
                      <p className="text-xs text-purple-400">{m.protein} protein</p>
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-slate-700/40 flex justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Protein</p>
                    <div className="w-32 h-1.5 bg-slate-700/60 rounded-full mt-1">
                      <div className="w-[72%] h-full bg-purple-500 rounded-full" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">115 / 160g</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Carbs</p>
                    <div className="w-32 h-1.5 bg-slate-700/60 rounded-full mt-1">
                      <div className="w-[65%] h-full bg-blue-500 rounded-full" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">195 / 300g</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fuel Score / Wellness */}
      <section id="fuel-score" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="lg:order-1">
              <div className="relative">
                <div className="absolute -inset-8 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                <img src={FUEL_SCORE_IMG} alt="Fuel Score Dashboard" className="relative rounded-2xl border border-slate-700/40 w-full shadow-2xl shadow-black/30" />
              </div>
            </div>

            {/* Content */}
            <div className="lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <span className="text-xs text-purple-400 font-medium">Fuel Score</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                More Than Macros.<br /><span className="text-purple-400">See How They Feel.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                A 30-second daily check-in captures sleep quality, stress levels, energy, soreness, and hydration. The Fuel Score gives you a single number that tells you how your client is really doing — not just what they&apos;re eating.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: 'Sleep Quality', icon: '😴' },
                  { label: 'Stress Level', icon: '🧠' },
                  { label: 'Energy Level', icon: '⚡' },
                  { label: 'Soreness', icon: '💪' },
                  { label: 'Hydration', icon: '💧' },
                  { label: 'Workout', icon: '🏋️' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-lg px-3 py-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-4">
                <p className="text-xs text-purple-400 uppercase tracking-wider mb-3">Zone System</p>
                <div className="space-y-2">
                  {[
                    { zone: 'Locked In', range: '85-100', color: 'bg-green-500', emoji: '🔥' },
                    { zone: 'On Track', range: '70-84', color: 'bg-blue-500', emoji: '💪' },
                    { zone: 'Dial It In', range: '50-69', color: 'bg-amber-500', emoji: '⚡' },
                    { zone: 'Red Flag', range: 'Below 50', color: 'bg-red-500', emoji: '🚩' },
                  ].map((z, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${z.color}`} />
                      <span className="text-sm text-slate-300 flex-1">{z.emoji} {z.zone}</span>
                      <span className="text-xs text-slate-500">{z.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body Comp Tracking */}
      <section id="body-comp" className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                <span className="text-xs text-purple-400 font-medium">Body Composition</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Track Progress.<br /><span className="text-purple-400">Prove Results.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Import InBody scans and track body composition changes over time. See lean mass gains, body fat reductions, and water balance — all in one place. Show your clients the data that proves your program works.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'InBody Scan Integration', desc: 'Import scan results and track changes over weeks and months' },
                  { title: 'Visual Progress Charts', desc: 'Lean mass vs. body fat trends that clients actually understand' },
                  { title: 'Before & After Comparisons', desc: 'Side-by-side scan data to celebrate wins and adjust plans' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center mt-0.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <img src={BODY_COMP} alt="Body Composition Tracking" className="relative rounded-2xl border border-slate-700/40 w-full shadow-2xl shadow-black/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Supplement Tracking */}
      <section id="supplements" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <span className="text-xs text-purple-400 font-medium">Supplement Safety</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Know What They&apos;re Taking.<br /><span className="text-purple-400">Protect Their Career.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Your clients log every supplement they take. Each one gets screened for banned substances and safety concerns. You get full visibility into what&apos;s going into their body — and peace of mind that nothing puts their eligibility at risk.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Supplement Logging', desc: 'Clients log every supplement — pre-workout, protein, creatine, vitamins, everything' },
                  { title: 'Banned Substance Screening', desc: 'Every supplement is checked against banned substance databases to protect eligibility' },
                  { title: 'Safety Alerts', desc: 'Get flagged immediately if a client logs something that could be a risk' },
                  { title: 'Full Supplement History', desc: 'Review what your clients are taking over time and spot patterns or concerns' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center mt-0.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplement mockup */}
            <div className="lg:order-1 relative">
              <div className="absolute -inset-4 bg-purple-500/5 rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Supplement Log</span>
                </div>
                {[
                  { name: 'Whey Protein Isolate', brand: 'Optimum Nutrition', status: 'Safe', statusColor: 'text-green-400', bgColor: 'bg-green-500/10' },
                  { name: 'Creatine Monohydrate', brand: 'Thorne', status: 'Safe', statusColor: 'text-green-400', bgColor: 'bg-green-500/10' },
                  { name: 'Pre-Workout Blend', brand: 'Unknown Brand', status: 'Review', statusColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
                  { name: 'Vitamin D3 + K2', brand: 'NOW Foods', status: 'Safe', statusColor: 'text-green-400', bgColor: 'bg-green-500/10' },
                  { name: 'Fat Burner Complex', brand: 'Online Purchase', status: 'Flagged', statusColor: 'text-red-400', bgColor: 'bg-red-500/10' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-t border-slate-700/40">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.brand}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.statusColor} ${s.bgColor}`}>
                      {s.status}
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-slate-700/40 text-center">
                  <p className="text-xs text-slate-500">5 supplements logged &middot; 1 flagged for review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Dashboard */}
      <section id="dashboard" className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span className="text-xs text-purple-400 font-medium">Coach Dashboard</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Every Client. <span className="text-purple-400">One Dashboard.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              See who&apos;s tracking, who&apos;s struggling, and who needs your attention — without chasing anyone down. Your dashboard gives you the full picture at a glance.
            </p>
          </div>

          <div className="mb-12">
            <div className="relative">
              <div className="absolute -inset-4 bg-purple-500/5 rounded-3xl blur-2xl pointer-events-none" />
              <img src={CLIENT_DASH} alt="Client Dashboard" className="relative rounded-2xl border border-slate-700/40 w-full shadow-2xl shadow-black/30" />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                icon: (
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ),
                title: 'Compliance Rates',
                desc: 'See who\'s logging meals and check-ins daily',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                ),
                title: 'Smart Alerts',
                desc: 'Get notified when a client\'s score drops or they stop tracking',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                ),
                title: 'In-App Messaging',
                desc: 'Reach out directly without texting your personal number',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ),
                title: 'Daily Recap Email',
                desc: 'Morning summary of yesterday\'s activity delivered to your inbox',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Up and Running in <span className="text-purple-400">Minutes</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              No complicated setup. No long onboarding. Get your clients tracking today.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Account',
                desc: 'Sign up as a coach. Set up your profile and customize your client dashboard preferences.',
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                ),
              },
              {
                step: '02',
                title: 'Invite Your Clients',
                desc: 'Send invite links to your clients. They create an account and they\'re connected to you instantly.',
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
              },
              {
                step: '03',
                title: 'Start Coaching Smarter',
                desc: 'See their meals, wellness scores, body comp data, and streaks — all from your dashboard. Intervene when it matters.',
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <p className="text-xs text-purple-400 font-bold tracking-widest mb-2">{item.step}</p>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900" />
            <div className="absolute inset-0 border border-purple-500/20 rounded-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="relative space-y-6">
              <LightningBolt className="w-12 h-12 mx-auto" />
              <h2 className="text-3xl sm:text-4xl font-bold">
                Ready to See the<br />
                <span className="text-purple-400">Full Picture?</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-lg mx-auto">
                Join coaches and trainers who are already using Fuel Different to deliver better results for their clients.
              </p>
              <button
                onClick={() => router.push('/signup')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-base px-10 py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/30"
              >
                Get Started Today &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <LightningBolt className="w-5 h-5" />
              <span className="font-bold text-white">Fuel Different</span>
              <span className="text-xs text-slate-600 ml-2">by VerifydAthlete</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/teams" className="hover:text-white transition-colors">For Teams</Link>
              <Link href="/gyms" className="hover:text-white transition-colors">For Gyms & Trainers</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
            </div>
            <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Fuel Different. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
