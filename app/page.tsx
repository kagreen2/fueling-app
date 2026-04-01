'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const LIGHTNING_ICON = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-lightning-icon-B5LtaPwMAWwPkoULwNEbea.png'
const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-hero-bg-MVnKGJNhByQXjBHybbrXBq.webp'
const ATHLETE_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-athlete-section-QrgLzuEReAb4d8r2FkQ8Ys.webp'
const COACH_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-coach-section-V4MCx87Z8tdmVmXWoCvfDA.webp'

function LightningBolt({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4.09 12.63C3.74 13.05 3.56 13.26 3.56 13.5C3.56 13.7 3.65 13.89 3.82 14.01C3.99 14.13 4.25 14.13 4.77 14.13H12L11 22L19.91 11.37C20.26 10.95 20.44 10.74 20.44 10.5C20.44 10.3 20.35 10.11 20.18 9.99C20.01 9.87 19.75 9.87 19.23 9.87H12L13 2Z" fill="#22C55E" stroke="#22C55E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function Home() {
  const router = useRouter()
  const [isPWA, setIsPWA] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Detect if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    if (isStandalone) {
      setIsPWA(true)
      // PWA users should go straight to their dashboard or login
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          // Check role and redirect
          supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
            if (data?.role === 'coach') router.replace('/coach/dashboard')
            else if (data?.role === 'admin') router.replace('/admin')
            else router.replace('/athlete/dashboard')
          })
        } else {
          router.replace('/login')
        }
      })
      return
    }
    setChecking(false)
  }, [router])

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  // Show a clean loading screen while checking PWA status or redirecting
  if (checking || isPWA) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LightningBolt className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-slate-900/85 backdrop-blur-lg border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LightningBolt className="w-7 h-7" />
            <span className="text-xl font-bold text-white tracking-tight">Fuel Different</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-slate-400">
            <button onClick={() => scrollToSection('the-edge')} className="hover:text-white transition-colors">The Edge</button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How It Works</button>
            <button onClick={() => scrollToSection('fitness-enthusiasts')} className="hover:text-white transition-colors">Fitness Enthusiasts</button>
            <button onClick={() => scrollToSection('for-coaches')} className="hover:text-white transition-colors">For Coaches</button>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-sm text-slate-300 hover:text-white"
            >
              Sign In
            </Button>
            <Button
              onClick={() => router.push('/signup')}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-24 px-4">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-900" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-green-500/10 border border-green-500/25 rounded-full">
              <LightningBolt className="w-4 h-4" />
              <span className="text-sm font-medium text-green-400">The Competitive Advantage Your Opponents Don&apos;t Have</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
              Fuel Different.
              <br />
              <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">Outperform.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-4 max-w-2xl leading-relaxed font-medium">
              Everyone trains hard. Not everyone fuels smart.
            </p>
            <p className="text-base sm:text-lg text-slate-400 mb-10 max-w-2xl leading-relaxed">
              Evidence-based nutrition coaching that gives athletes and their coaches the edge they need to dominate. Personalized macros, AI meal tracking, InBody integration, and real-time coach communication — built for teams that refuse to settle.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/signup')}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base px-8"
              >
                Start Dominating
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => scrollToSection('the-edge')}
                className="text-base border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8"
              >
                See What You&apos;re Missing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-4 border-t border-slate-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Your Competition Is <span className="text-purple-400">Guessing</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10">
            Most athletes train hard but fuel blindly. They don&apos;t know their real calorie needs, they don&apos;t track what they eat, and they have no idea if their supplements are safe or effective. That&apos;s the gap. That&apos;s your opportunity.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { stat: '73%', label: 'of athletes don\'t know their daily calorie needs' },
              { stat: '2x', label: 'more likely to get injured when dehydrated during competition' },
              { stat: '1 in 4', label: 'supplements contain banned or undisclosed substances' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-6">
                <div className="text-3xl font-black text-purple-400 mb-2">{item.stat}</div>
                <div className="text-sm text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Edge - Features */}
      <section id="the-edge" className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your <span className="text-green-400">Unfair Advantage</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              While your competition guesses, you&apos;ll have precision. Every tool you need to fuel like a pro and perform at your peak.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                ),
                title: 'AI Meal Tracking',
                desc: 'Snap a photo. Get instant macros. No more guessing what\'s on your plate — our platform breaks it down and tells you exactly how it fits your targets.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ),
                title: 'Precision Macros',
                desc: 'Not generic calculator numbers. Your macros are built from your actual body composition, sport demands, training phase, and goals — backed by ISSN research.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                ),
                title: 'InBody Integration',
                desc: 'Upload your InBody 580 scan and unlock precision BMR. No more estimated formulas — your plan is built on your real body composition data.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                ),
                title: 'Daily Check-ins',
                desc: 'Track energy, sleep, soreness, and stress. Your coach sees the trends before problems become injuries — and adjusts your plan accordingly.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                ),
                title: 'Coach Messaging',
                desc: 'Direct line to your coach. Get real-time feedback on meals, ask questions, and stay accountable. No more waiting until the next practice.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                ),
                title: 'Supplement Safety',
                desc: 'Don\'t risk your eligibility. Every supplement gets screened for banned substances and safety before you take it. Protect your career.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:border-green-500/40 hover:bg-slate-800/60 transition-all duration-300"
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
              From Zero to <span className="text-green-400">Dialed In</span> in 5 Minutes
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              No complicated setup. No waiting on a nutritionist. Your personalized plan, ready now.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Build Your Profile',
                desc: 'Tell us your sport, position, body stats, and goals. Upload an InBody scan for maximum precision — or skip it and we\'ll still dial you in.',
              },
              {
                step: '02',
                title: 'Get Your Battle Plan',
                desc: 'Our evidence-based engine calculates your exact calorie and macro targets. Not cookie-cutter numbers — targets built for your body and your sport.',
              },
              {
                step: '03',
                title: 'Execute & Dominate',
                desc: 'Track meals with AI, check in daily, stay connected with your coach, and watch your performance separate from the pack.',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-black text-green-500/10 mb-3">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Athletes */}
      <section className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-purple-500/10 border border-purple-500/25 rounded-full">
                <span className="text-sm font-medium text-purple-400">For Athletes</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Same Sport.<br /><span className="text-purple-400">Unfair Advantage.</span>
              </h2>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                Your opponents train the same hours you do. The difference is what happens off the field. Fuel Different gives you the precision nutrition edge that turns hard work into dominance.
              </p>
              <div className="space-y-4">
                {[
                  'Macros tailored to your sport, position & training phase',
                  'AI meal tracking — snap a photo, get instant feedback',
                  'InBody-powered precision BMR (no more guessing)',
                  'Daily wellness tracking your coach actually sees',
                  'Direct messaging with your nutrition coach',
                  'Supplement screening to protect your eligibility',
                  'Body composition trends that prove you\'re improving',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-purple-900/20">
              <img src={ATHLETE_IMG} alt="Athlete using Fuel Different app" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* For Fitness Enthusiasts */}
      <section id="fitness-enthusiasts" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-green-900/20 bg-slate-800/40 p-8">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">💪</div>
                  <div className="text-2xl font-bold text-white mb-2">You Show Up. Every. Day.</div>
                  <div className="text-slate-400">Now make every rep count.</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: '5:30 AM', label: 'Alarm goes off' },
                    { val: '4-5x', label: 'Workouts per week' },
                    { val: '???', label: 'Calories needed' },
                    { val: '???', label: 'Protein target' },
                  ].map((s, i) => (
                    <div key={i} className="bg-slate-700/40 rounded-lg p-3 text-center">
                      <div className={`text-lg font-bold ${i < 2 ? 'text-green-400' : 'text-red-400'}`}>{s.val}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-1.5 text-sm text-green-400 font-medium">
                    <LightningBolt className="w-4 h-4" />
                    Fuel Different fills in the blanks.
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-green-500/10 border border-green-500/25 rounded-full">
                <span className="text-sm font-medium text-green-400">For Fitness Enthusiasts</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                You Train Like an Athlete.<br /><span className="text-green-400">Fuel Like One.</span>
              </h2>
              <p className="text-slate-400 mb-4 text-lg leading-relaxed">
                You don&apos;t need a roster spot to take your nutrition seriously. You hit the gym before sunrise, you push through when it hurts, and you hold yourself to a higher standard. That&apos;s an athlete.
              </p>
              <p className="text-slate-400 mb-8 text-base leading-relaxed">
                But here&apos;s the truth: most gym-goers are leaving results on the table because they&apos;re guessing on nutrition. Fuel Different gives you the same evidence-based system that collegiate and professional athletes use — personalized for <em>your</em> body, <em>your</em> training style, and <em>your</em> goals.
              </p>
              <div className="space-y-4">
                {[
                  'Personalized macros based on your training style — strength, CrossFit, cardio, or mixed',
                  'AI meal tracking that takes 5 seconds — just snap a photo',
                  'InBody scan integration for precision body composition tracking',
                  'Goal-specific plans: lose fat, build muscle, or optimize performance',
                  'Direct access to a nutrition coach who keeps you accountable',
                  'No bro science — every number is backed by ISSN research',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button
                  onClick={() => router.push('/signup')}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base px-8"
                >
                  Start Fueling Smarter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Coaches */}
      <section id="for-coaches" className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-purple-900/20">
              <img src={COACH_IMG} alt="Coach reviewing team dashboard" className="w-full h-auto" />
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-green-500/10 border border-green-500/25 rounded-full">
                <span className="text-sm font-medium text-green-400">For Coaches</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                You Don&apos;t Have to Be a Nutritionist.<br /><span className="text-green-400">The App Does the Heavy Lifting.</span>
              </h2>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                You already have enough on your plate — game plans, practice schedules, player development. Fuel Different handles the nutrition science so you don&apos;t have to. Your role? Hold them accountable. The app gives you the visibility to see who&apos;s committed and who&apos;s falling behind, so you can step in at the right moment.
              </p>
              <div className="space-y-4">
                {[
                  'See at a glance who\'s fueling right and who\'s not — no nutrition degree required',
                  'The app builds personalized plans for each athlete automatically',
                  'Get alerts when an athlete misses meals, check-ins, or falls off track',
                  'One dashboard to monitor your entire roster\'s nutrition compliance',
                  'InBody scan tracking shows you body composition trends over time',
                  'Message athletes directly when they need a push',
                  'One-click invite codes — onboard your whole team in minutes',
                  'Supplement screening protects your athletes\' eligibility',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built on Science */}
      <section className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Not Bro Science. <span className="text-purple-400">Real Science.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Every recommendation is grounded in peer-reviewed sports nutrition research from the ISSN and ACSM. The same science used by D1 programs and Olympic teams.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🧬', label: 'Katch-McArdle BMR' },
              { icon: '📐', label: 'Mifflin-St Jeor Fallback' },
              { icon: '🏋️', label: 'Sport-Specific Multipliers' },
              { icon: '🎯', label: 'Goal-Phase Adjustments' },
              { icon: '📊', label: 'InBody 580 Integration' },
              { icon: '🤖', label: 'AI Meal Analysis' },
              { icon: '💧', label: 'Hydration Protocols' },
              { icon: '🛡️', label: 'Supplement Screening' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 text-center hover:border-slate-600/60 transition-colors">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-medium text-slate-300">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-2xl mx-auto text-center">
          <LightningBolt className="w-12 h-12 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Your Competition Won&apos;t Wait.<br />Neither Should You.
          </h2>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Every day you&apos;re not fueling with precision is a day your opponent is closing the gap. Commit to the program. Dominate your sport.
          </p>
          <Button
            onClick={() => router.push('/signup')}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base px-10"
          >
            Start Dominating
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LightningBolt className="w-5 h-5" />
                <span className="font-bold text-white">Fuel Different</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">Evidence-based nutrition coaching for athletes, fitness enthusiasts, and coaches who refuse to settle.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-300 mb-4 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><button onClick={() => scrollToSection('the-edge')} className="hover:text-white transition-colors">The Edge</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollToSection('fitness-enthusiasts')} className="hover:text-white transition-colors">Fitness Enthusiasts</button></li>
                <li><button onClick={() => scrollToSection('for-coaches')} className="hover:text-white transition-colors">For Coaches</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-300 mb-4 text-sm uppercase tracking-wider">Account</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><a href="/login" className="hover:text-white transition-colors">Sign In</a></li>
                <li><a href="/signup" className="hover:text-white transition-colors">Create Account</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-300 mb-4 text-sm uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800/60 pt-8 text-center text-slate-600 text-sm">
            <p>&copy; {new Date().getFullYear()} Fuel Different. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
