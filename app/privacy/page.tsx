'use client'

import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-purple-400 hover:text-purple-300 transition">
            Fuel Different
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-400 mb-10">Last updated: March 26, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Fuel Different (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates a performance nutrition tracking platform 
              designed for student athletes, coaches, and parents. We are committed to protecting the privacy and security 
              of all users, with special attention to the data of minor athletes. This Privacy Policy explains how we collect, 
              use, store, and protect your personal information when you use our application and services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-slate-200 mb-3">2.1 Account Information</h3>
            <p className="mb-4">
              When you create an account, we collect your name, email address, and role (athlete, coach, parent, or administrator). 
              For athlete accounts, we also collect age, sex, sport, position, and team assignment.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">2.2 Health and Nutrition Data</h3>
            <p className="mb-4">
              To provide personalized nutrition recommendations, we collect and process the following health-related data:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Height, weight, and body composition data (including InBody scan results)</li>
              <li>Daily meal logs, including food photos and descriptions</li>
              <li>Hydration tracking data</li>
              <li>Supplement usage and requests</li>
              <li>Daily wellness check-ins (energy, stress, soreness, sleep)</li>
              <li>Training schedules and season phases</li>
              <li>Calculated nutrition targets (calories, macronutrients)</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">2.3 Biometric Data</h3>
            <p className="mb-4">
              If you use the InBody scan feature, we collect body composition metrics including but not limited to: 
              body fat percentage, skeletal muscle mass, lean body mass, body water content, BMI, segmental lean analysis, 
              ECW/TBW ratio, and visceral fat area. This data may be entered manually, extracted from uploaded photos of 
              InBody result sheets using AI image analysis, or received via API integration with InBody devices.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">2.4 Photos and Images</h3>
            <p className="mb-4">
              We process meal photos for AI-powered nutritional analysis and InBody result sheet photos for data extraction. 
              Meal photos are processed by our AI service and the extracted nutritional data is stored. InBody scan photos 
              may be stored in our secure cloud storage for reference purposes.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">2.5 Payment Information</h3>
            <p>
              Payment processing is handled by Stripe, a PCI-compliant payment processor. We do not store credit card 
              numbers or full payment details on our servers. We retain subscription status, plan type, and billing history 
              for account management purposes.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide personalized nutrition recommendations and calorie/macro targets</li>
              <li>Analyze meals and provide coaching feedback using AI</li>
              <li>Evaluate supplement safety for student athletes</li>
              <li>Track wellness trends and alert coaches to potential concerns</li>
              <li>Enable coaches to monitor and support their assigned athletes</li>
              <li>Generate progress reports and body composition trend analysis</li>
              <li>Process payments and manage subscriptions</li>
              <li>Improve our services and algorithms</li>
            </ul>
          </section>

          {/* Data Sharing and Access */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Access</h2>
            
            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.1 Within the Platform</h3>
            <p className="mb-4">
              Athlete data is accessible to their assigned coach(es) and team administrators. Coaches can view 
              their athletes&apos; nutrition logs, wellness check-ins, biometric data, and supplement requests. 
              Administrators have access to all user data for platform management purposes.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.2 Third-Party Services</h3>
            <p className="mb-4">We share data with the following third-party services strictly for operational purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Supabase</strong> — Database hosting and user authentication</li>
              <li><strong>Anthropic (Claude AI)</strong> — Meal photo analysis, supplement safety evaluation, and InBody scan data extraction</li>
              <li><strong>Stripe</strong> — Payment processing</li>
              <li><strong>Vercel</strong> — Application hosting</li>
            </ul>
            <p>
              We do not sell, rent, or trade your personal information to third parties for marketing purposes.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including: encrypted data transmission 
              (HTTPS/TLS), row-level security policies in our database ensuring users can only access their own data, 
              authenticated API endpoints, secure session management, and role-based access controls. Biometric scan photos 
              are stored in private cloud storage buckets with access restricted to authorized users.
            </p>
          </section>

          {/* Minors and Parental Consent */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Minors and Parental Consent</h2>
            <p className="mb-4">
              Our platform serves student athletes, some of whom may be under 18 years of age. We take the following 
              measures to protect minor users:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Athletes under 18 should have parental or guardian consent before creating an account</li>
              <li>Parents may request access to their child&apos;s data or account deletion at any time</li>
              <li>We do not knowingly collect data from children under 13 without verifiable parental consent</li>
              <li>Supplement requests flagged as high-risk require parental approval</li>
            </ul>
            <p>
              If you are a parent or guardian and believe your child has provided personal information without your consent, 
              please contact us immediately.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services. 
              Nutrition logs, wellness check-ins, and biometric scan history are retained to enable progress tracking 
              and trend analysis. If you request account deletion, we will remove your personal data within 30 days, 
              except where retention is required by law.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing at any time</li>
              <li>Opt out of non-essential data collection</li>
            </ul>
          </section>

          {/* AI Processing Disclosure */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. AI Processing Disclosure</h2>
            <p>
              Our platform uses artificial intelligence to analyze meal photos, evaluate supplement safety, and extract 
              data from InBody scan result sheets. These AI analyses are provided as informational tools and should not 
              be considered medical or dietary advice. AI-generated nutritional estimates may not be 100% accurate. 
              Photos submitted for AI analysis are processed by Anthropic&apos;s Claude AI service and are subject to 
              Anthropic&apos;s data handling policies. We recommend consulting with a qualified nutritionist or healthcare 
              provider for personalized dietary guidance.
            </p>
          </section>

          {/* FERPA Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Educational Records (FERPA)</h2>
            <p>
              If our platform is used in connection with an educational institution, certain data may be considered 
              educational records under the Family Educational Rights and Privacy Act (FERPA). We will cooperate with 
              educational institutions to ensure compliance with FERPA requirements and will not disclose student 
              information to unauthorized parties.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material changes by posting 
              the updated policy on this page with a revised &ldquo;Last updated&rdquo; date. Continued use of the platform 
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, wish to exercise your data rights, or have concerns 
              about how your information is handled, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="font-semibold text-white">Fuel Different</p>
              <p>Email: crossfitironflag@gmail.com</p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>&copy; 2026 Fuel Different. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-purple-400">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
