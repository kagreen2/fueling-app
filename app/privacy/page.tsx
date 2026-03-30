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
            &larr; Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-400 mb-10">Last updated: March 30, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Fuel Different (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates a performance nutrition tracking platform
              designed for athletes, general fitness enthusiasts, coaches, and parents. We are committed to protecting the privacy and security
              of all users, with special attention to the data of minor athletes. This Privacy Policy explains how we collect,
              use, store, and protect your personal information when you use our application and services (the &ldquo;Service&rdquo;).
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">2.1 Account Information</h3>
            <p className="mb-4">
              When you create an account, we collect your name, email address, and role (athlete, general fitness, coach, parent, or administrator).
              For athlete and general fitness accounts, we also collect age, sex, sport (if applicable), position, team assignment,
              activity level, and training style.
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

            <h3 className="text-lg font-semibold text-slate-200 mb-3">2.3 Body Composition Data (InBody Scans)</h3>
            <p className="mb-4">
              If you use the InBody scan feature, we collect body composition metrics including but not limited to:
              body fat percentage, skeletal muscle mass, lean body mass, fat-free mass, body water content, BMI, segmental lean analysis,
              ECW/TBW ratio, visceral fat area, and basal metabolic rate (BMR). This data may be entered manually or extracted
              from uploaded photos of InBody result sheets using AI image analysis.
            </p>
            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg mb-4">
              <p className="text-blue-200 font-semibold mb-2">Body Composition Data Consent</p>
              <p className="text-sm text-blue-100/80">
                By uploading an InBody scan, you consent to Fuel Different collecting, processing, and securely storing your body
                composition data to provide personalized nutrition recommendations. This data is shared only with your assigned
                coach(es) and team administrators within the platform. It is never sold to third parties. You may request deletion
                of this data at any time through your account settings or by contacting us at crossfitironflag@gmail.com.
              </p>
            </div>
            <p className="mb-4">
              <strong>Clarification regarding Illinois BIPA:</strong> Body composition metrics (weight, body fat percentage,
              skeletal muscle mass, BMI, etc.) are health and wellness measurements, not &ldquo;biometric identifiers&rdquo; as
              defined under the Illinois Biometric Information Privacy Act (740 ILCS 14). We do not collect fingerprints, retina
              scans, voiceprints, facial geometry, or other biometric identifiers through the Service.
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

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide personalized nutrition recommendations and calorie/macro targets</li>
              <li>Analyze meals and provide coaching feedback using AI</li>
              <li>Evaluate supplement safety for athletes</li>
              <li>Track wellness trends and alert coaches to potential concerns</li>
              <li>Enable coaches to monitor and support their assigned athletes and members</li>
              <li>Generate progress reports and body composition trend analysis</li>
              <li>Process payments and manage subscriptions</li>
              <li>Improve our services and algorithms</li>
              <li>Communicate with you about your account, updates, and service changes</li>
            </ul>
          </section>

          {/* 4. Consumer Health Data Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Consumer Health Data Privacy Policy</h2>
            <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg mb-4">
              <p className="text-purple-200 font-semibold">
                Required under Washington My Health My Data Act (RCW 19.373), Connecticut Public Act 23-56, and Nevada SB 370
              </p>
            </div>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.1 Categories of Health Data Collected</h3>
            <p className="mb-4">We collect the following categories of consumer health data:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Body measurements:</strong> Height, weight, body fat percentage, skeletal muscle mass, lean body mass, BMI, visceral fat area</li>
              <li><strong>Nutrition data:</strong> Meal logs, calorie intake, macronutrient intake, hydration levels</li>
              <li><strong>Wellness indicators:</strong> Energy levels, sleep quality, soreness levels, stress levels</li>
              <li><strong>Supplement usage:</strong> Supplement names, dosages, and safety evaluations</li>
              <li><strong>Fitness information:</strong> Sport, position, training phase, activity level, training style, goals</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.2 Purpose of Collection</h3>
            <p className="mb-4">
              Consumer health data is collected solely for the purpose of providing personalized nutrition recommendations,
              enabling coach oversight, tracking progress, and improving the Service. We do not sell consumer health data.
              We do not share consumer health data for advertising purposes.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.3 Consent</h3>
            <p className="mb-4">
              <strong>We collect consumer health data only with your affirmative, voluntary consent.</strong> You provide
              this consent when you create an account, enter health data into the Service, or upload InBody scan photos.
              You may withdraw consent at any time by contacting us or deleting your account.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.4 Your Rights Under State Health Data Laws</h3>
            <p className="mb-4">If you are a resident of Washington, Connecticut, Nevada, or any state with consumer health data privacy laws, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Confirm whether we are collecting or processing your consumer health data</li>
              <li>Access the specific consumer health data we have collected about you</li>
              <li>Request deletion of your consumer health data</li>
              <li>Withdraw consent for future collection of consumer health data</li>
              <li>Be free from discrimination for exercising these rights</li>
            </ul>
          </section>

          {/* 5. Data Sharing and Access */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Sharing and Access</h2>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">5.1 Within the Platform</h3>
            <p className="mb-4">
              Athlete and member data is accessible to their assigned coach(es) and team administrators. Coaches can view
              their athletes&apos; nutrition logs, wellness check-ins, biometric data, supplement requests, and messages.
              Administrators have access to all user data for platform management purposes.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">5.2 Third-Party Services</h3>
            <p className="mb-4">We share data with the following third-party services strictly for operational purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Supabase</strong> — Database hosting and user authentication</li>
              <li><strong>Anthropic (Claude AI)</strong> — Meal photo analysis, supplement safety evaluation, and InBody scan data extraction</li>
              <li><strong>Stripe</strong> — Payment processing</li>
              <li><strong>Vercel</strong> — Application hosting</li>
            </ul>
            <p>
              <strong>We do not sell, rent, or trade your personal information or consumer health data to third parties
              for marketing, advertising, or any other purposes.</strong>
            </p>
          </section>

          {/* 6. Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including: encrypted data transmission
              (HTTPS/TLS), row-level security policies in our database ensuring users can only access their own data,
              authenticated API endpoints, secure session management, and role-based access controls. Biometric scan photos
              are stored in private cloud storage buckets with access restricted to authorized users.
            </p>
          </section>

          {/* 7. Data Breach Notification */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Data Breach Notification</h2>
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg mb-4">
              <p className="text-yellow-200 font-semibold">FTC Health Breach Notification Rule (16 CFR Part 318)</p>
            </div>
            <p>
              In the event of a data breach involving your personal information or health data, we will notify affected
              users without unreasonable delay and no later than 60 days after discovery of the breach. Notification will
              be provided via email to the address associated with your account. If the breach involves the health data of
              500 or more individuals, we will also notify the Federal Trade Commission as required by the FTC Health Breach
              Notification Rule. We maintain an internal incident response plan to ensure timely detection, containment,
              and notification of data security incidents.
            </p>
          </section>

          {/* 8. Minors and Parental Consent (COPPA) */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Minors and Parental Consent (COPPA Compliance)</h2>
            <p className="mb-4">
              Our platform serves student athletes, some of whom may be under 18 years of age. We take the following
              measures to protect minor users:
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">8.1 Users Under 13</h3>
            <p className="mb-4">
              In compliance with the Children&apos;s Online Privacy Protection Act (COPPA), <strong>users under 13 years of age
              may not create an account or use the Service without verifiable parental consent.</strong> Parents or guardians
              must contact us at crossfitironflag@gmail.com to complete a parental consent verification process before an
              account for a child under 13 is activated. If we discover that we have collected personal information from a
              child under 13 without verifiable parental consent, we will promptly delete that information and deactivate
              the associated account.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">8.2 Users Ages 13&ndash;17</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Athletes between 13 and 17 should have parental or guardian consent before creating an account</li>
              <li>Parents may request access to their child&apos;s data or account deletion at any time</li>
              <li>Supplement requests flagged as high-risk require parental approval</li>
            </ul>
            <p>
              If you are a parent or guardian and believe your child has provided personal information without your consent,
              please contact us immediately at crossfitironflag@gmail.com.
            </p>
          </section>

          {/* 9. California Residents (CCPA/CPRA) */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. California Residents (CCPA/CPRA)</h2>
            <p className="mb-4">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA)
              and the California Privacy Rights Act (CPRA):
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Right to Know:</strong> You may request that we disclose the categories and specific pieces of personal information we have collected about you, the categories of sources, the business purposes for collection, and the categories of third parties with whom we share your data.</li>
              <li><strong>Right to Delete:</strong> You may request deletion of your personal information, subject to certain exceptions.</li>
              <li><strong>Right to Correct:</strong> You may request correction of inaccurate personal information.</li>
              <li><strong>Right to Opt-Out of Sale:</strong> We do not sell your personal information. We do not share your personal information for cross-context behavioral advertising.</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA/CPRA rights.</li>
              <li><strong>Right to Limit Use of Sensitive Personal Information:</strong> You may request that we limit the use of your sensitive personal information (including health data) to purposes necessary to provide the Service.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at crossfitironflag@gmail.com. We will verify your identity before
              processing your request and respond within 45 days.
            </p>
          </section>

          {/* 10. Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Data Retention</h2>
            <p className="mb-4">
              We retain your personal data for as long as your account is active or as needed to provide services.
              Nutrition logs, wellness check-ins, and biometric scan history are retained to enable progress tracking
              and trend analysis.
            </p>
            <p className="mb-4">
              <strong>Retention schedule:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Account data:</strong> Retained while account is active; deleted within 30 days of account deletion request</li>
              <li><strong>Health and nutrition data:</strong> Retained while account is active; deleted within 30 days of account deletion request</li>
              <li><strong>Body composition data (InBody):</strong> Retained while account is active; deleted within 30 days of deletion request</li>
              <li><strong>Meal photos:</strong> Processed for nutritional analysis; retained while account is active</li>
              <li><strong>Payment records:</strong> Retained as required by applicable tax and financial regulations</li>
              <li><strong>Chat messages:</strong> Retained while account is active; deleted within 30 days of account deletion request</li>
            </ul>
            <p>
              If you request account deletion, we will remove your personal data within 30 days, except where retention
              is required by law.
            </p>
          </section>

          {/* 11. Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Your Rights</h2>
            <p className="mb-4">Regardless of your state of residence, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing at any time</li>
              <li>Opt out of non-essential data collection</li>
            </ul>
          </section>

          {/* 12. AI Processing Disclosure */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. AI Processing Disclosure</h2>
            <p>
              Our platform uses artificial intelligence to analyze meal photos, evaluate supplement safety, and extract
              data from InBody scan result sheets. These AI analyses are provided as informational tools and should not
              be considered medical or dietary advice. AI-generated nutritional estimates may not be 100% accurate.
              Photos submitted for AI analysis are processed by Anthropic&apos;s Claude AI service and are subject to
              Anthropic&apos;s data handling policies. We recommend consulting with a qualified nutritionist or healthcare
              provider for personalized dietary guidance.
            </p>
          </section>

          {/* 13. FERPA Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Educational Records (FERPA)</h2>
            <p>
              If our platform is used in connection with an educational institution, certain data may be considered
              educational records under the Family Educational Rights and Privacy Act (FERPA). We will cooperate with
              educational institutions to ensure compliance with FERPA requirements and will not disclose student
              information to unauthorized parties.
            </p>
          </section>

          {/* 14. Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material changes by posting
              the updated policy on this page with a revised &ldquo;Last updated&rdquo; date and, where required by law,
              by sending email notification. Continued use of the platform after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">15. Contact Us</h2>
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
