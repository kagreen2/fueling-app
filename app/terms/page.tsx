'use client'

import Link from 'next/link'

export default function TermsOfServicePage() {
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
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-slate-400 mb-10">Last updated: March 26, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* Acceptance */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Fuel Different platform (&ldquo;Service&rdquo;), you agree to be bound by these 
              Terms of Service (&ldquo;Terms&rdquo;). If you are under 18 years of age, your parent or legal guardian must 
              agree to these Terms on your behalf before you may use the Service. If you do not agree to these Terms, 
              you may not access or use the Service.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p>
              Fuel Different is a performance nutrition tracking platform designed for student athletes, coaches, and parents. 
              The Service provides tools for meal logging, nutrition analysis, hydration tracking, body composition monitoring, 
              supplement safety evaluation, wellness check-ins, and personalized macro recommendations. The Service uses 
              artificial intelligence to assist with meal analysis and data extraction from body composition scan results.
            </p>
          </section>

          {/* Not Medical Advice */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Not Medical or Dietary Advice</h2>
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg mb-4">
              <p className="text-yellow-200 font-semibold">Important Disclaimer</p>
            </div>
            <p className="mb-4">
              The Service is an informational and tracking tool only. It does not provide medical advice, diagnosis, or treatment. 
              The nutrition recommendations, macro targets, and AI-generated meal analyses provided by the Service are estimates 
              based on general sports nutrition guidelines and should not be considered a substitute for professional dietary 
              counseling or medical advice.
            </p>
            <p className="mb-4">
              You should consult with a qualified healthcare provider, registered dietitian, or sports nutritionist before 
              making significant changes to your diet, especially if you have any medical conditions, food allergies, or 
              specific dietary needs.
            </p>
            <p>
              AI-powered nutritional estimates may not be 100% accurate. Users should verify nutritional information and 
              use the Service as a supplementary tool alongside professional guidance.
            </p>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. User Accounts</h2>
            
            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.1 Account Creation</h3>
            <p className="mb-4">
              You must create an account to use the Service. You agree to provide accurate, current, and complete information 
              during registration and to keep your account information updated. You are responsible for maintaining the 
              confidentiality of your account credentials.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.2 Minor Users</h3>
            <p className="mb-4">
              Users under 18 years of age must have parental or guardian consent to use the Service. Parents and guardians 
              are responsible for monitoring their child&apos;s use of the Service. We reserve the right to require 
              verification of parental consent.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.3 Account Types</h3>
            <p>
              The Service offers different account types (athlete, coach, parent, administrator) with varying levels of 
              access and functionality. You agree to use your account only for its intended purpose and in accordance 
              with your assigned role.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Access another user&apos;s account without authorization</li>
              <li>Attempt to circumvent security measures or access controls</li>
              <li>Upload malicious content, viruses, or harmful code</li>
              <li>Use the Service to harass, bully, or harm other users</li>
              <li>Misrepresent your identity, role, or affiliation</li>
              <li>Use automated tools to scrape, harvest, or extract data from the Service</li>
              <li>Share or distribute other users&apos; health or personal data without authorization</li>
              <li>Use the AI features to generate harmful, misleading, or inappropriate content</li>
            </ul>
          </section>

          {/* Coach and Administrator Responsibilities */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Coach and Administrator Responsibilities</h2>
            <p className="mb-4">
              Coaches and administrators who access athlete data through the Service agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use athlete data solely for the purpose of supporting athlete nutrition and wellness</li>
              <li>Maintain the confidentiality of athlete health information</li>
              <li>Not share athlete data with unauthorized third parties</li>
              <li>Comply with applicable privacy laws, including FERPA where applicable</li>
              <li>Report any suspected data breaches or unauthorized access immediately</li>
              <li>Ensure that nutrition guidance provided through the platform is supplemented by qualified professionals</li>
            </ul>
          </section>

          {/* Supplement Safety */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Supplement Safety Evaluations</h2>
            <p>
              The Service provides AI-powered supplement safety evaluations as an informational tool. These evaluations 
              are based on general guidelines and publicly available information about supplements. They do not constitute 
              medical advice and should not be the sole basis for supplement use decisions. Athletes should consult with 
              their healthcare provider and verify supplement compliance with their sport&apos;s governing body (e.g., 
              NCAA, NAIA, state athletic associations) before use. Fuel Different is not liable for any adverse effects 
              resulting from supplement use.
            </p>
          </section>

          {/* Subscription and Payment */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Subscription and Payment</h2>
            <p className="mb-4">
              Certain features of the Service require a paid subscription. By subscribing, you agree to pay the applicable 
              fees as described at the time of purchase. Subscriptions are billed through Stripe and may be monthly or 
              annual as selected.
            </p>
            <p className="mb-4">
              You may cancel your subscription at any time through your account settings or the Stripe customer portal. 
              Cancellation will take effect at the end of the current billing period. We do not provide prorated refunds 
              for partial billing periods unless required by law.
            </p>
            <p>
              We reserve the right to change subscription pricing with 30 days&apos; notice to existing subscribers.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Intellectual Property</h2>
            <p className="mb-4">
              The Service, including its design, features, algorithms, and content (excluding user-generated content), 
              is owned by Fuel Different and protected by intellectual property laws. You may not copy, modify, distribute, 
              or create derivative works based on the Service without our written permission.
            </p>
            <p>
              You retain ownership of the content you submit to the Service (meal photos, check-in data, etc.). By 
              submitting content, you grant us a limited license to process, store, and display that content as necessary 
              to provide the Service.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, FUEL DIFFERENT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Health outcomes resulting from following nutrition recommendations or macro targets</li>
              <li>Inaccurate AI-generated meal analyses or nutritional estimates</li>
              <li>Adverse reactions to supplements evaluated through the Service</li>
              <li>Data loss or unauthorized access to your account</li>
              <li>Service interruptions or downtime</li>
            </ul>
            <p>
              Our total liability for any claims arising from the Service shall not exceed the amount you paid for the 
              Service in the 12 months preceding the claim.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Fuel Different, its officers, directors, employees, and agents 
              from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your 
              use of the Service, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for 
              any other reason at our discretion. Upon termination, your right to use the Service will cease immediately. 
              You may request deletion of your data in accordance with our Privacy Policy.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated through the Service or via email. 
              Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms. 
              If you do not agree to the modified Terms, you should discontinue use of the Service.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Illinois,
              without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service
              shall be resolved in the courts located in Illinois.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">15. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at:
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
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="text-purple-400">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
