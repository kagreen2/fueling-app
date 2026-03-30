'use client'

import { useRouter } from 'next/navigation'
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

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
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
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How It Works</button>
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
              <span className="text-sm font-medium text-green-400">For Athletes, Coaches &amp; Fitness Enthusiasts</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
              Fuel Your
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Performance</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed">
              Evidence-based nutrition coaching powered by AI. Personalized macros, smart meal tracking, InBody integration, and real-time coach communication — all in one app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/signup')}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base px-8"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => scrollToSection('features')}
                className="text-base border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8"
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to <span className="text-green-400">Perform</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Built from the ground up for athletes and coaches who take nutrition seriously.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                ),
                title: 'AI Meal Tracking',
                desc: 'Snap a photo of your meal and get an instant macro breakdown. Our AI analyzes your food and provides personalized coaching feedback.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ),
                title: 'Personalized Macros',
                desc: 'ISSN evidence-based calculations tailored to your body composition, sport, training phase, and goals. Powered by Katch-McArdle when InBody data is available.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                ),
                title: 'InBody Integration',
                desc: 'Upload your InBody 580 scan and we automatically extract your body composition data for precision BMR calculation and progress tracking.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                ),
                title: 'Daily Check-ins',
                desc: 'Track energy, sleep, soreness, and stress levels daily. Your coach sees trends and gets alerts when something needs attention.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                ),
                title: 'Coach Messaging',
                desc: 'Direct messaging between athletes and coaches. Get real-time guidance, feedback on meals, and answers to nutrition questions.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                ),
                title: 'Supplement Safety',
                desc: 'Submit supplements for AI-powered safety review and coach approval. Get flagged for banned substances before you take them.',
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
      <section id="how-it-works" className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get Started in <span className="text-green-400">3 Steps</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              From signup to personalized nutrition targets in under 5 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                desc: 'Choose Athlete or General Fitness. Enter your body stats, goals, and optionally upload an InBody scan for maximum accuracy.',
              },
              {
                step: '02',
                title: 'Get Your Plan',
                desc: 'Our evidence-based calculator generates personalized calorie and macro targets based on your body composition, activity level, and goals.',
              },
              {
                step: '03',
                title: 'Track & Improve',
                desc: 'Log meals with AI photo analysis, check in daily, track hydration, and communicate with your coach — all from your dashboard.',
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
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-purple-500/10 border border-purple-500/25 rounded-full">
                <span className="text-sm font-medium text-purple-400">For Athletes &amp; Members</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Your Nutrition,<br /><span className="text-purple-400">Dialed In</span>
              </h2>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                Whether you're a competitive athlete or focused on general fitness, get a nutrition plan built around your body, your goals, and your lifestyle.
              </p>
              <div className="space-y-4">
                {[
                  'Personalized calorie & macro targets',
                  'AI-powered meal photo analysis',
                  'Daily wellness check-ins',
                  'Hydration tracking',
                  'InBody body composition progress',
                  'Direct coach messaging',
                  'Supplement safety reviews',
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
                Your Team,<br /><span className="text-green-400">At a Glance</span>
              </h2>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                Monitor your entire roster from one dashboard. Get real-time alerts, manage nutrition plans, and communicate directly with each athlete.
              </p>
              <div className="space-y-4">
                {[
                  'Team dashboard with real-time alerts',
                  'Individual athlete nutrition management',
                  'Biometric scan tracking & trends',
                  'Direct messaging with athletes',
                  'Supplement approval workflow',
                  'Team invite codes for easy onboarding',
                  'Wellness & recovery monitoring',
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

      {/* Capabilities Grid */}
      <section className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built on <span className="text-purple-400">Science</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Every recommendation is grounded in peer-reviewed sports nutrition research from the ISSN and ACSM.
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
      <section className="py-24 px-4 bg-slate-800/20 border-t border-slate-800/60">
        <div className="max-w-2xl mx-auto text-center">
          <LightningBolt className="w-12 h-12 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Ready to Fuel Different?
          </h2>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Join athletes and coaches who are taking nutrition seriously with evidence-based, personalized fueling plans.
          </p>
          <Button
            onClick={() => router.push('/signup')}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base px-10"
          >
            Get Started
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
              <p className="text-slate-500 text-sm leading-relaxed">Evidence-based nutrition coaching for athletes and fitness enthusiasts.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-300 mb-4 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How It Works</button></li>
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
