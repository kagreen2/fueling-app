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
            <button onClick={() => scrollToSection('nutrition')} className="text-slate-400 hover:text-white transition-colors">Nutrition</button>
            <button onClick={() => scrollToSection('fuel-score')} className="text-slate-400 hover:text-white transition-colors">Fuel Score</button>
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

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: HERO
          Lead with visibility — what coaches actually want to hear
      ═══════════════════════════════════════════════════════════════ */}
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
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Sports Nutrition Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[0.95] tracking-tight mb-6">
                <span className="text-white">See What Your</span>
                <br />
                <span className="text-white">Athletes </span>
                <span className="text-purple-400">Eat & Feel</span>
              </h1>

              <p className="text-lg text-slate-400 max-w-lg leading-relaxed mb-8">
                Complete visibility into your athletes&apos; nutrition, wellness, and readiness — without chasing them down. AI meal tracking, individualized macros, daily wellness check-ins, and a coach dashboard that shows you everything.
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
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-xs text-slate-500">AI Meal Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span className="text-xs text-slate-500">Individualized Macros</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-xs text-slate-500">Coach Dashboard</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <img src={COACH_DASH_IMG} alt="Coach Dashboard" className="relative w-full max-w-md mx-auto rounded-2xl shadow-2xl shadow-black/30 border border-slate-700/40" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: AI NUTRITION TRACKING
          The hook — "Can I see what my athletes are eating?"
      ═══════════════════════════════════════════════════════════════ */}
      <section id="nutrition" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">AI Nutrition Tracking</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Finally See What<br />
                <span className="text-purple-400">Your Athletes Eat</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed mb-6">
                Athletes snap a photo of their plate and AI instantly estimates calories and macros. No more guessing, no more food diaries that never get filled out. You see every meal, every day, across your entire roster.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { title: 'Photo-to-Macros in Seconds', desc: 'AI analyzes the meal photo and returns calories, protein, carbs, and fat instantly. Athletes can also log manually.' },
                  { title: 'Compliance at a Glance', desc: 'See which athletes are logging meals and hitting their targets — and which ones are falling off.' },
                  { title: 'AI Coach Feedback', desc: 'Every meal gets a quality assessment with actionable suggestions. "Great protein — add a complex carb before practice."' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">{item.title}</h4>
                      <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meal tracking mockup */}
            <div className="relative">
              <div className="absolute -inset-8 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative rounded-2xl overflow-hidden bg-slate-800/30 p-8 border border-slate-700/60">
                <div className="flex items-center gap-3 mb-6">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">AI Meal Analysis</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">High Confidence</span>
                </div>

                <div className="text-center text-5xl mb-4">🥗</div>
                <p className="text-center text-sm text-slate-400 mb-6">Grilled Chicken Power Bowl</p>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Calories', value: '680', color: 'text-green-400' },
                    { label: 'Protein', value: '52g', color: 'text-blue-400' },
                    { label: 'Carbs', value: '64g', color: 'text-amber-400' },
                    { label: 'Fat', value: '22g', color: 'text-cyan-400' },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-2.5 rounded-lg bg-slate-700/40">
                      <p className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">AI Coach</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Great protein hit — 29% of daily target in one meal. Consider adding sweet potato for sustained energy before afternoon practice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: INDIVIDUALIZED MACRO PLANS
          "How much work is this? Can I customize per athlete?"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Individualized Targets</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Every Athlete Gets <span className="text-purple-400">Their Own Plan</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              A 280lb offensive lineman and a 150lb point guard don&apos;t eat the same way. Set personalized calorie and macro targets based on sport, position, body composition, and training phase.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Macro comparison mockup */}
            <div className="space-y-4">
              {/* Athlete 1 */}
              <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-lg">🏈</div>
                  <div>
                    <p className="font-semibold text-white">Marcus Williams</p>
                    <p className="text-xs text-slate-500">OL &middot; 6&apos;4&quot; &middot; 285 lbs</p>
                  </div>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Bulking</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Calories', target: '4,200', pct: 82, color: 'bg-green-500' },
                    { label: 'Protein', target: '220g', pct: 91, color: 'bg-blue-500' },
                    { label: 'Carbs', target: '480g', pct: 75, color: 'bg-amber-500' },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{m.label}</span>
                        <span className="text-slate-500 font-mono">{m.target}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Athlete 2 */}
              <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-lg">🏀</div>
                  <div>
                    <p className="font-semibold text-white">Jaylen Torres</p>
                    <p className="text-xs text-slate-500">PG &middot; 6&apos;1&quot; &middot; 175 lbs</p>
                  </div>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">Maintenance</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Calories', target: '2,800', pct: 88, color: 'bg-green-500' },
                    { label: 'Protein', target: '160g', pct: 78, color: 'bg-blue-500' },
                    { label: 'Carbs', target: '320g', pct: 85, color: 'bg-amber-500' },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{m.label}</span>
                        <span className="text-slate-500 font-mono">{m.target}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: explanation */}
            <div className="space-y-6">
              {[
                { title: 'Sport & Position-Specific', desc: 'Macro targets are calculated based on the athlete\'s sport demands, position, body weight, and training phase. A wrestler cutting weight has different needs than a swimmer in peak season.' },
                { title: 'Adjustable by Coaches', desc: 'Coaches and sports dietitians can override or fine-tune any athlete\'s targets at any time. Shift from bulking to cutting with a few taps.' },
                { title: 'Evidence-Based Calculations', desc: 'Targets follow ISSN (International Society of Sports Nutrition) guidelines for protein, carbohydrate, and fat recommendations for athletes.' },
                { title: 'Body Comp Integration', desc: 'When InBody, DEXA, or other body composition data is available, macro targets automatically adjust based on lean mass and body fat percentage.' },
              ].map((item, i) => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-purple-400 font-bold text-sm">0{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{item.title}</h4>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: THE FUEL SCORE
          The differentiator — "Macros tell you what they ate. This tells you if they're ready."
      ═══════════════════════════════════════════════════════════════ */}
      <section id="fuel-score" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">The Fuel Score</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Macros Tell You What They Ate.<br />
              <span className="text-purple-400">This Tells You If They&apos;re Ready.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              An athlete can hit every macro target and still show up to practice exhausted, dehydrated, and stressed about exams. The Fuel Score captures what nutrition tracking alone can&apos;t — a 30-second daily check-in on sleep, stress, energy, soreness, and hydration that gives you one number for readiness.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mt-12">
            {/* Zone cards */}
            <div className="space-y-4">
              {[
                { name: 'Locked In', emoji: '🔥', range: '85-100', color: 'bg-green-500', borderColor: 'border-green-500/30', textColor: 'text-green-400', desc: 'Performing at their best. Sleep, stress, and nutrition are all dialed in.' },
                { name: 'On Track', emoji: '💪', range: '70-84', color: 'bg-blue-500', borderColor: 'border-blue-500/30', textColor: 'text-blue-400', desc: 'Solid foundation. Minor tweaks to sleep or hydration could push them higher.' },
                { name: 'Dial It In', emoji: '⚡', range: '50-69', color: 'bg-amber-500', borderColor: 'border-amber-500/30', textColor: 'text-amber-400', desc: 'Something needs attention. Check their sleep and stress levels.' },
                { name: 'Red Flag', emoji: '🚨', range: 'Below 50', color: 'bg-red-500', borderColor: 'border-red-500/30', textColor: 'text-red-400', desc: 'You get alerted immediately. Time for a conversation about recovery.' },
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
              <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
                <p className="text-sm text-slate-300 font-medium">30 seconds. 5 sliders. Every morning.</p>
                <p className="text-xs text-slate-500 mt-1">Sleep &middot; Stress &middot; Energy &middot; Soreness &middot; Hydration</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: COACH DASHBOARD
          "Can I actually monitor 50+ athletes without drowning?"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Coach Command Center</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your Entire Roster.<br />
              <span className="text-purple-400">One Dashboard.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              See every athlete&apos;s Fuel Score, nutrition compliance, streak, and wellness status at a glance. Know who&apos;s locked in and who needs a conversation — without chasing anyone down.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img src={COACH_DASH_IMG} alt="Coach Dashboard" className="w-full rounded-2xl shadow-2xl shadow-black/30 border border-slate-700/40" />
            </div>

            <div className="space-y-6">
              {[
                { num: '01', title: 'Team Overview', desc: 'Every athlete\'s Fuel Score, meal compliance, and streak count in one sortable table. Click any athlete to drill into their full history.' },
                { num: '02', title: 'Zone Distribution', desc: 'A donut chart shows how many athletes are Locked In, On Track, Dial It In, or Red Flag — your team\'s health at a glance.' },
                { num: '03', title: 'Smart Alerts', desc: 'Automatic notifications when athletes hit Red Flag zones, show declining trends over 3+ days, miss check-ins, or report high stress.' },
                { num: '04', title: 'Daily Recap Email', desc: 'Every night, coaches receive a full summary — who checked in, who didn\'t, red flags, nutrition compliance, and action items.' },
                { num: '05', title: 'Supplement Visibility', desc: 'See what every athlete is taking. Athletes log their supplements, the system flags anything that needs review, and coaches can recommend approved alternatives — keeping your program\'s supplement protocol clean.' },
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

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: ENGAGEMENT ENGINE
          Why athletes actually stick with it
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Built-In Accountability</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                They&apos;ll Actually<br />
                <span className="text-purple-400">Use It Every Day</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed mb-8">
                The biggest problem with nutrition apps isn&apos;t features — it&apos;s compliance. Fuel Different is built with gamification and social accountability so athletes want to check in, not just have to.
              </p>

              <div className="space-y-5">
                {[
                  { title: 'Consistency Streaks', desc: 'Check in 5+ days in a row and earn a Fuel Score bonus. Athletes compete to keep their streaks alive. Coaches see who\'s consistent and who\'s ghosting.' },
                  { title: 'Push Notifications', desc: 'Smart reminders at the right time — morning check-in prompts, meal logging nudges, and streak-at-risk alerts that keep athletes engaged.' },
                  { title: 'Coach Messaging', desc: 'Direct messaging between athletes and coaches. Add notes to check-ins. Athletes know someone is watching — and that drives accountability.' },
                  { title: 'Leaderboards', desc: 'Team leaderboards for streaks and compliance. Competitive athletes don\'t want to be at the bottom of the list.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">{item.title}</h4>
                      <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:order-1 relative">
              <div className="absolute -inset-8 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <img src={STREAK_IMG} alt="Streak System" className="relative w-full max-w-sm mx-auto rounded-2xl shadow-2xl shadow-black/30 border border-slate-700/40" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-slate-800/40 to-slate-900/60" />
            <div className="relative z-10 space-y-6">
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
