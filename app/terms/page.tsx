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
            &larr; Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-slate-400 mb-10">Last updated: March 30, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* 1. Acceptance */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Fuel Different platform (&ldquo;Service&rdquo;), you agree to be bound by these
              Terms of Service (&ldquo;Terms&rdquo;). If you are under 18 years of age, your parent or legal guardian must
              agree to these Terms on your behalf before you may use the Service. <strong>Users under 13 years of age may
              not use the Service without verifiable parental consent as described in Section 5.2.</strong> If you do not
              agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p>
              Fuel Different is an evidence-based performance nutrition tracking platform designed for athletes, general
              fitness enthusiasts, coaches, and parents. The Service provides tools for meal logging, AI-powered nutrition
              analysis, hydration tracking, body composition monitoring (including InBody 580 scan integration), supplement
              safety evaluation, wellness check-ins, coach&ndash;athlete messaging, and personalized macro recommendations
              based on peer-reviewed sports nutrition research from the ISSN and ACSM.
            </p>
          </section>

          {/* 3. Not Medical Advice — Strengthened */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Not Medical or Dietary Advice</h2>
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg mb-4">
              <p className="text-yellow-200 font-semibold">Important Disclaimer</p>
            </div>
            <p className="mb-4">
              The Service is an informational and tracking tool only. <strong>It does not provide medical advice,
              diagnosis, or treatment. The Service does not diagnose, treat, cure, or prevent any disease or medical
              condition.</strong> The nutrition recommendations, macro targets, and AI-generated meal analyses provided
              by the Service are estimates based on general sports nutrition guidelines and published research. They
              should not be considered a substitute for professional dietary counseling, medical advice, or the guidance
              of a registered dietitian.
            </p>
            <p className="mb-4">
              You should consult with a qualified healthcare provider, registered dietitian, or sports nutritionist before
              making significant changes to your diet, especially if you have any medical conditions, food allergies,
              eating disorders, or specific dietary needs.
            </p>
            <p className="mb-4">
              AI-powered nutritional estimates may not be 100% accurate. Users should verify nutritional information and
              use the Service as a supplementary tool alongside professional guidance. <strong>Individual results will
              vary based on genetics, adherence, medical history, and other factors.</strong>
            </p>
            <p>
              Fuel Different is not responsible for any health outcomes, adverse effects, or injuries resulting from
              following the nutrition recommendations, macro targets, or any other information provided through the Service.
            </p>
          </section>

          {/* 4. User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. User Accounts</h2>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.1 Account Creation</h3>
            <p className="mb-4">
              You must create an account to use the Service. You agree to provide accurate, current, and complete information
              during registration and to keep your account information updated. You are responsible for maintaining the
              confidentiality of your account credentials and for all activity that occurs under your account.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">4.2 Account Types</h3>
            <p>
              The Service offers different account types (Athlete, General Fitness, Coach, Administrator) with varying levels of
              access and functionality. You agree to use your account only for its intended purpose and in accordance
              with your assigned role.
            </p>
          </section>

          {/* 5. Age Requirements and Parental Consent (COPPA) */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Age Requirements and Parental Consent</h2>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">5.1 Users Ages 13&ndash;17</h3>
            <p className="mb-4">
              Users between the ages of 13 and 17 may use the Service with the consent of a parent or legal guardian.
              By allowing a minor to use the Service, the parent or guardian agrees to these Terms on the minor&rsquo;s
              behalf and assumes responsibility for the minor&rsquo;s use of the Service.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">5.2 Users Under 13 (COPPA Compliance)</h3>
            <p className="mb-4">
              In compliance with the Children&rsquo;s Online Privacy Protection Act (COPPA), <strong>users under 13 years
              of age may not create an account or use the Service without verifiable parental consent.</strong> If you are
              a parent or guardian and wish to allow your child under 13 to use the Service, you must contact us at
              crossfitironflag@gmail.com to complete a parental consent verification process before the account is activated.
            </p>
            <p>
              If we discover that we have collected personal information from a child under 13 without verifiable parental
              consent, we will promptly delete that information and deactivate the associated account.
            </p>
          </section>

          {/* 6. Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Acceptable Use</h2>
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

          {/* 7. Coach and Administrator Responsibilities */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Coach and Administrator Responsibilities</h2>
            <p className="mb-4">
              Coaches and administrators who access athlete or member data through the Service agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use athlete and member data solely for the purpose of supporting nutrition and wellness</li>
              <li>Maintain the confidentiality of all health information accessed through the Service</li>
              <li>Not share user data with unauthorized third parties</li>
              <li>Comply with applicable privacy laws, including FERPA where applicable</li>
              <li>Report any suspected data breaches or unauthorized access immediately</li>
              <li>Ensure that nutrition guidance provided through the platform is supplemented by qualified professionals</li>
              <li>Obtain appropriate consent when working with minor athletes</li>
            </ul>
          </section>

          {/* 8. Supplement Safety */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Supplement Safety Evaluations</h2>
            <p>
              The Service provides AI-powered supplement safety evaluations as an informational tool. These evaluations
              are based on general guidelines and publicly available information about supplements. <strong>They do not
              constitute medical advice and should not be the sole basis for supplement use decisions.</strong> Athletes
              should consult with their healthcare provider and verify supplement compliance with their sport&apos;s
              governing body (e.g., NCAA, NAIA, state athletic associations) before use. Fuel Different is not liable
              for any adverse effects resulting from supplement use.
            </p>
          </section>

          {/* 9. Subscription, Payment, and Auto-Renewal (Illinois Automatic Contract Renewal Act) */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Subscription, Payment, and Auto-Renewal</h2>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">9.1 Subscription Terms</h3>
            <p className="mb-4">
              Certain features of the Service require a paid subscription. By subscribing, you agree to pay the applicable
              fees as described at the time of purchase. Subscriptions are billed through Stripe, a PCI-compliant payment
              processor.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">9.2 Automatic Renewal</h3>
            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg mb-4">
              <p className="text-blue-200 font-semibold">Auto-Renewal Notice (Illinois Automatic Contract Renewal Act, 815 ILCS 601)</p>
            </div>
            <p className="mb-4">
              <strong>Your subscription will automatically renew at the end of each billing period (monthly or annual, as
              selected) at the then-current subscription rate, unless you cancel before the renewal date.</strong> You will
              be charged the renewal fee using the payment method on file. We will send a reminder notification before each
              renewal.
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">9.3 Cancellation</h3>
            <p className="mb-4">
              You may cancel your subscription at any time through your account settings or the Stripe customer portal.
              Cancellation will take effect at the end of the current billing period. You will continue to have access to
              paid features until the end of the period you have already paid for. <strong>We do not provide prorated
              refunds for partial billing periods unless required by applicable law.</strong>
            </p>

            <h3 className="text-lg font-semibold text-slate-200 mb-3">9.4 Price Changes</h3>
            <p>
              We reserve the right to change subscription pricing with at least 30 days&apos; written notice to existing
              subscribers. If you do not agree to a price change, you may cancel your subscription before the new pricing
              takes effect.
            </p>
          </section>

          {/* 10. Health Data Consent */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Health Data Collection and Consent</h2>
            <p className="mb-4">
              The Service collects and processes health-related data, including but not limited to: body weight, height,
              body composition metrics (from InBody scans), dietary intake, hydration levels, supplement usage, and
              wellness indicators (energy, stress, soreness, sleep quality).
            </p>
            <p className="mb-4">
              <strong>By using the Service, you provide your affirmative and voluntary consent to the collection,
              processing, storage, and use of your health data as described in our <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">Privacy Policy</Link>.</strong> This
              consent is required under applicable state consumer health data privacy laws, including but not limited to
              the Washington My Health My Data Act (RCW 19.373), Connecticut Public Act 23-56, and Nevada SB 370.
            </p>
            <p>
              You may withdraw your consent and request deletion of your health data at any time by contacting us at
              crossfitironflag@gmail.com or through your account settings. Withdrawal of consent may limit or prevent
              your ability to use certain features of the Service.
            </p>
          </section>

          {/* 11. Body Composition Data (InBody) */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Body Composition Data (InBody Scans)</h2>
            <p className="mb-4">
              The Service allows users to upload photos of InBody 580 body composition scan results. When you upload an
              InBody scan, our AI system extracts body composition metrics including but not limited to: body weight, body
              fat percentage, skeletal muscle mass, lean body mass, body water content, BMI, segmental lean analysis,
              ECW/TBW ratio, visceral fat area, and basal metabolic rate (BMR).
            </p>
            <p className="mb-4">
              <strong>By uploading an InBody scan, you consent to Fuel Different collecting, processing, and securely
              storing your body composition data to provide personalized nutrition recommendations.</strong> This data
              is shared only with your assigned coach(es) and team administrators within the platform. It is never sold
              to third parties.
            </p>
            <p className="mb-4">
              Body composition data is retained for as long as your account is active to enable progress tracking and
              trend analysis. You may request deletion of specific scan records or all body composition data at any time
              by contacting us at crossfitironflag@gmail.com.
            </p>
            <p>
              InBody scan photos may be stored in secure cloud storage for reference purposes and are accessible only
              to you and your assigned coach(es).
            </p>
          </section>

          {/* 12. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Intellectual Property</h2>
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

          {/* 13. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Limitation of Liability</h2>
            <p className="mb-4">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
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
              <li>Decisions made based on body composition data or trend analysis</li>
            </ul>
            <p>
              Our total liability for any claims arising from the Service shall not exceed the amount you paid for the
              Service in the 12 months preceding the claim.
            </p>
          </section>

          {/* 14. Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Fuel Different, its officers, directors, employees, and agents
              from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your
              use of the Service, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          {/* 15. Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">15. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for
              any other reason at our discretion. Upon termination, your right to use the Service will cease immediately.
              You may request deletion of your data in accordance with our <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* 16. Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">16. Dispute Resolution</h2>
            <p className="mb-4">
              Any dispute arising from or relating to these Terms or the Service shall first be attempted to be resolved
              through good-faith negotiation between the parties. If the dispute cannot be resolved through negotiation
              within 30 days, either party may pursue resolution through the courts as described in Section 17.
            </p>
          </section>

          {/* 17. Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">17. Governing Law and Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Illinois,
              without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service
              shall be resolved in the state or federal courts located in Illinois. Notwithstanding the foregoing,
              nothing in this section limits the applicability of consumer protection laws of your state of residence
              where such laws cannot be waived by contract.
            </p>
          </section>

          {/* 18. Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">18. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated through the Service or via email
              at least 15 days before they take effect. Your continued use of the Service after the effective date of
              any changes constitutes acceptance of the updated Terms. If you do not agree to the updated Terms, you
              must stop using the Service and may cancel your subscription.
            </p>
          </section>

          {/* 19. Severability */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">19. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction,
              that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions
              of these Terms shall remain in full force and effect.
            </p>
          </section>

          {/* 20. Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">20. Contact Us</h2>
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
