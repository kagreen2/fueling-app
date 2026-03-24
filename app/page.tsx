'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
            ⚡ Fuel Different
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-sm"
            >
              Sign In
            </Button>
              <Button
                onClick={() => router.push('/signup')}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Get Started
              </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
          </div>

          {/* Main content */}
          <div className="relative z-10">
            <div className="inline-block mb-6 px-4 py-2 bg-purple-600/10 border border-purple-600/30 rounded-full">
              <span className="text-sm font-semibold text-purple-500">
                🏆 Built for High School & College Athletes
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Performance Fueling
              <br />
              <span className="bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Track your nutrition, hydration, and recovery with AI-powered insights. Get personalized coaching from your team, right in your pocket.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                onClick={() => router.push('/signup')}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-lg"
              >
                Start Free Trial →
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="text-lg"
              >
                Learn More
              </Button>
            </div>

            {/* Feature highlights */}
            <div className="grid md:grid-cols-3 gap-6 mt-20">
              {[
                {
                  icon: '🍽️',
                  title: 'Smart Meal Tracking',
                  desc: 'Upload a photo and get instant macro estimates with AI coaching feedback',
                },
                {
                  icon: '💧',
                  title: 'Hydration Monitoring',
                  desc: 'Track water intake and urine color to optimize your performance',
                },
                {
                  icon: '📊',
                  title: 'Progress Analytics',
                  desc: 'Visualize your trends and get personalized recommendations',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-purple-600/50 transition-all duration-300"
                >
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-20">
            Everything You Need to Perform
          </h2>

          <div className="grid md:grid-cols-2 gap-16 items-start">
            {[
              {
                icon: '✅',
                title: 'Daily Check-ins',
                items: ['Energy levels', 'Sleep quality', 'Soreness & recovery', 'Stress tracking'],
              },
              {
                icon: '💊',
                title: 'Supplement Safety',
                items: ['AI-powered reviews', 'Coach approval workflow', 'Parent oversight', 'Banned substance alerts'],
              },
              {
                icon: '👥',
                title: 'Team Management',
                items: ['Coach dashboards', 'Parent portals', 'Team analytics', 'Alert system'],
              },
              {
                icon: '🎯',
                title: 'Personalized Goals',
                items: ['Calorie targets', 'Macro recommendations', 'Hydration goals', 'Recovery plans'],
              },
            ].map((section, i) => (
              <div key={i} className="space-y-4 text-center">
                <div className="text-3xl mb-2 flex justify-center">{section.icon}</div>
                <h3 className="text-2xl font-semibold">{section.title}</h3>
                <ul className="space-y-2 flex flex-col items-center">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-3 text-slate-300">
                      <span className="text-green-400">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 px-4 bg-slate-800/30 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Trusted by Athletes
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: 'This app completely changed how I track my nutrition. The AI feedback is spot-on.',
                author: 'Sarah M.',
                role: 'Varsity Soccer',
              },
              {
                quote: 'As a coach, I love having visibility into my athletes\' daily habits and recovery.',
                author: 'Coach Johnson',
                role: 'Football Coach',
              },
              {
                quote: 'The supplement safety reviews give me peace of mind as a parent.',
                author: 'Jennifer P.',
                role: 'Parent',
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-6"
              >
                <p className="text-slate-300 mb-4 italic">\"{ testimonial.quote}\"</p>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-slate-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Fuel Different?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join athletes across the country who are optimizing their performance with smarter nutrition tracking.
          </p>
          <Button
            onClick={() => router.push('/signup')}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-lg"
          >
            Get Started Free →
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Fuel Different</h3>
              <p className="text-slate-400 text-sm">Performance fueling for serious athletes.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2026 Fuel Different. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}