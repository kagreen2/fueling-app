'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const InteractiveDemo = dynamic(() => import('@/components/InteractiveDemo'), { ssr: false })

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/hero-fuel-score-6LB3dNjSYxmVb4soTVcD85.webp'
const FUEL_SCORE_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-score-dashboard-d7aLb2Rk48NJHjiiYroNah.webp'
const COACH_DASH_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/coach-dashboard-view-XHEP7vTjUC8crJjBF7yLVh.webp'
const CHECKIN_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/checkin-flow-VK22DPZdv6KzjCPy4uuznA.webp'
const STREAK_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/streak-badge-gBunbAMTsuU8tdmjoYTnVQ.webp'

function LightningBolt({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4.09 12.63C3.74 13.05 3.56 13.26 3.56 13.5C3.56 13.7 3.65 13.89 3.82 14.01C3.99 14.13 4.25 14.13 4.77 14.13H12L11 22L19.91 11.37C20.26 10.95 20.44 10.74 20.44 10.5C20.44 10.3 20.35 10.11 20.18 9.99C20.01 9.87 19.75 9.87 19.23 9.87H12L13 2Z" fill="#22C55E" stroke="#22C55E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function TeamsPage() {
  const router = useRouter()
  const [demoOpen, setDemoOpen] = useState(false)

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
            <span className="text-purple-400 font-medium">For Teams</span>
            <Link href="/gyms" className="text-slate-400 hover:text-white transition-colors">For Gyms & Trainers</Link>
            <button onClick={() => scrollToSection('fuel-score')} className="text-slate-400 hover:text-white transition-colors">Fuel Score</button>
            <button onClick={() => scrollToSection('features')} className="text-slate-400 hover:text-white transition-colors">Features</button>
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
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/60 to-slate-900" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Athlete Wellness Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[0.95] tracking-tight mb-6">
                <span className="text-white">Know Your</span>
                <br />
                <span className="text-purple-400">Fuel Score</span>
              </h1>

              <p className="text-lg text-slate-400 max-w-lg leading-relaxed mb-8">
                The daily wellness check-in that gives athletes and coaches a single number to track readiness. 30 seconds a day. Complete visibility into sleep, stress, energy, soreness, and hydration.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push('/signup')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-base px-8 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/30"
                >
                  Start Fueling &rarr;
                </button>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 font-semibold text-base px-8 py-3 rounded-xl transition-all"
                >
                  Try the Demo
                </button>
              </div>

              <div className="flex items-center gap-6 pt-6">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span className="text-xs text-slate-500">Daily Check-ins</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-xs text-slate-500">Coach Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  <span className="text-xs text-slate-500">Team Ready</span>
                </div>
              </div>
            </div>

            {/* Right: Fuel Score preview card */}
            <div className="relative">
              <div className="absolute -inset-8 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <img src={FUEL_SCORE_IMG} alt="Fuel Score Dashboard" className="relative w-full max-w-md mx-auto rounded-2xl shadow-2xl shadow-black/30 border border-slate-700/40" />
            </div>
          </div>
        </div>
      </section>

      {/* Fuel Score Zones */}
      <section id="fuel-score" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">The Fuel Score</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              One Number. <span className="text-purple-400">Complete Clarity.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Every morning, athletes rate their sleep, stress, energy, soreness, and hydration on simple sliders. The Fuel Score calculates instantly — a 0-100 number that tells coaches exactly who&apos;s ready and who needs attention.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Zone cards */}
            <div className="space-y-4">
              {[
                { name: 'Locked In', emoji: '🔥', range: '85-100', color: 'bg-green-500', borderColor: 'border-green-500/30', textColor: 'text-green-400', desc: 'Performing at your best. Keep doing what you\'re doing.' },
                { name: 'On Track', emoji: '💪', range: '70-84', color: 'bg-blue-500', borderColor: 'border-blue-500/30', textColor: 'text-blue-400', desc: 'Solid foundation. Minor tweaks could push you higher.' },
                { name: 'Dial It In', emoji: '⚡', range: '50-69', color: 'bg-amber-500', borderColor: 'border-amber-500/30', textColor: 'text-amber-400', desc: 'Something needs attention. Check your sleep and hydration.' },
                { name: 'Red Flag', emoji: '🚨', range: 'Below 50', color: 'bg-red-500', borderColor: 'border-red-500/30', textColor: 'text-red-400', desc: 'Coach gets alerted. Time to recover and reset.' },
              ].map((zone) => (
                <div
                  key={zone.name}
                  className={`flex items-center gap-5 p-5 rounded-2xl bg-slate-800/40 border ${zone.borderColor} hover:bg-slate-800/60 transition-all`}
                >
                  <div className={`w-14 h-14 rounded-xl ${zone.color} flex items-center justify-center text-2xl shrink-0`}>
                    {zone.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-lg font-bold ${zone.textColor}`}>{zone.name}</h3>
                      <span className="text-xs text-slate-500 font-mono">{zone.range}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{zone.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Check-in image */}
            <div className="relative">
              <div className="absolute -inset-8 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <img src={CHECKIN_IMG} alt="Daily Check-in Flow" className="relative w-full max-w-md mx-auto rounded-2xl shadow-2xl shadow-black/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for Athletes <span className="text-purple-400">and Coaches</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ),
                title: '30-Second Check-ins',
                desc: 'Five quick sliders — sleep, stress, energy, soreness, hydration. Your Fuel Score calculates instantly. Do it every morning before practice.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                ),
                title: 'Consistency Streaks',
                desc: 'Check in 5+ days in a row and earn a Fuel Score bonus. Coaches see who\'s consistent and who\'s ghosting. Gamified accountability.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                ),
                title: 'Trend Tracking',
                desc: 'See if your score is climbing or dropping with day-over-day indicators. A 65 that was 80 yesterday is very different from a 65 that was 50.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
                title: 'AI Meal Scoring',
                desc: 'Snap a photo of your plate and get instant calorie estimates, macro breakdowns, and a meal quality score powered by AI.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                ),
                title: 'Smart Alerts',
                desc: 'Coaches get automatic alerts when athletes hit Red Flag zones, miss check-ins, or show declining trends over 3+ days.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                ),
                title: 'Coach Messaging',
                desc: 'Direct messaging between athletes and coaches. Add notes to check-ins. Daily recap emails keep coaches in the loop.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:border-purple-500/40 hover:bg-slate-800/60 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-700/60 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Three Steps to <span className="text-purple-400">Better Performance</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              No complicated setup. Your athletes are checking in within minutes.
            </p>
          </div>

          <div className="space-y-16">
            {[
              { num: '01', title: 'Check In Daily', desc: 'Rate your sleep, stress, energy, soreness, and hydration on simple sliders. Takes 30 seconds.', img: CHECKIN_IMG },
              { num: '02', title: 'Get Your Fuel Score', desc: 'Your responses calculate a 0-100 score that tells you exactly where you stand. Zone names make it instantly clear.', img: FUEL_SCORE_IMG },
              { num: '03', title: 'Build Your Streak', desc: 'Check in 5+ consecutive days to earn bonus points. The longer your streak, the bigger the boost. Stay accountable.', img: STREAK_IMG },
            ].map((step, i) => (
              <div key={step.num} className={`grid lg:grid-cols-2 gap-12 items-center`}>
                <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="text-6xl font-extrabold text-slate-800/60 mb-3">{step.num}</div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white -mt-4 mb-3">{step.title}</h3>
                  <p className="text-lg text-slate-400 leading-relaxed max-w-md">{step.desc}</p>
                </div>
                <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                  <img src={step.img} alt={step.title} className="w-full max-w-sm mx-auto rounded-2xl shadow-xl shadow-black/20 border border-slate-700/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coach Dashboard Section */}
      <section className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">For Coaches</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Complete Team <span className="text-purple-400">Visibility</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              See every athlete&apos;s Fuel Score, streak, and compliance at a glance. Know who&apos;s locked in and who needs attention — without asking.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img src={COACH_DASH_IMG} alt="Coach Dashboard" className="w-full rounded-2xl shadow-2xl shadow-black/30 border border-slate-700/40" />
            </div>

            <div className="space-y-6">
              {[
                { num: '01', title: 'Team Overview', desc: 'See every athlete\'s Fuel Score, streak, and compliance at a glance. Sort by any column to find who needs attention.' },
                { num: '02', title: 'Zone Distribution', desc: 'A donut chart shows how many athletes are Locked In, On Track, Dial It In, or Red Flag — instant team health pulse.' },
                { num: '03', title: 'Automated Alerts', desc: 'Get notified when athletes hit Red Flag zones, show declining trends, report high stress for 3+ days, or miss check-ins.' },
                { num: '04', title: 'Daily Recap Email', desc: 'Every night at 11:30 PM, coaches receive a full summary — who checked in, who didn\'t, red flags, and action items.' },
              ].map((f) => (
                <div key={f.num} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-purple-400 font-bold text-sm">{f.num}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{f.title}</h4>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nutrition Section */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Nutrition Tracking</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Track Every Meal.<br />
                <span className="text-purple-400">Hit Every Target.</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed mb-6">
                Personalized calorie and macro goals based on your sport, position, and body composition. Log meals with AI photo analysis or quick manual entry. Coaches see compliance trends across the entire roster.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <p className="text-2xl font-bold text-purple-400">AI</p>
                  <p className="text-xs text-slate-400 mt-1">Photo meal analysis</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <p className="text-2xl font-bold text-purple-400">ISSN</p>
                  <p className="text-xs text-slate-400 mt-1">Evidence-based targets</p>
                </div>
              </div>
            </div>

            <div className="lg:order-1">
              <div className="relative rounded-2xl overflow-hidden bg-slate-800/30 p-8 border border-slate-700/60">
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                    <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Today&apos;s Nutrition</span>
                  </div>
                  {[
                    { label: 'Calories', current: '2,846', target: '3,600', pct: 79, color: 'bg-green-500' },
                    { label: 'Protein', current: '156g', target: '180g', pct: 87, color: 'bg-blue-500' },
                    { label: 'Carbs', current: '310g', target: '360g', pct: 86, color: 'bg-amber-500' },
                    { label: 'Fat', current: '89g', target: '120g', pct: 74, color: 'bg-cyan-500' },
                  ].map((m) => (
                    <div key={m.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">{m.label}</span>
                        <span className="text-slate-500 font-mono text-xs">{m.current} / {m.target}</span>
                      </div>
                      <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900" />
            <div className="absolute inset-0 border border-purple-500/20 rounded-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="relative space-y-6">
              <LightningBolt className="w-12 h-12 mx-auto" />
              <h2 className="text-3xl sm:text-4xl font-bold">
                Ready to Fuel<br />
                <span className="text-purple-400">Different?</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-lg mx-auto">
                Give your athletes the accountability tool they actually want to use. Give your coaching staff the visibility they need.
              </p>
              <button
                onClick={() => router.push('/signup')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-base px-10 py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/30"
              >
                Get Started &rarr;
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
      {demoOpen && <InteractiveDemo onClose={() => setDemoOpen(false)} />}
    </main>
  )
}
