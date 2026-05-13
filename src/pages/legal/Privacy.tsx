{/* TODO: Have a lawyer review before relying on this for jurisdictional compliance. */}
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { APP_NAME } from '@/config/app';
import { ROUTES } from '@/config/routes';

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: May 13, 2026</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <p>
              At {APP_NAME}, we take your privacy seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our appointment scheduling platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
            <p>
              We collect the following types of information:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li><strong>Account Information:</strong> Email address, full name, and password (encrypted)</li>
              <li><strong>Profile Information:</strong> Profile photos, business addresses, phone numbers, service descriptions, and availability schedules</li>
              <li><strong>Appointment Data:</strong> Booking details, appointment times, cancellation history, and communication between users and providers</li>
              <li><strong>Payment Information:</strong> Payment data is processed by Lemon Squeezy (our payment processor). We do not store full credit card numbers or sensitive payment details on our servers.</li>
              <li><strong>Usage Data:</strong> IP addresses, browser type, device information, pages visited, and interaction logs for analytics and security</li>
              <li><strong>Cookies:</strong> We use cookies to maintain sessions, remember preferences, and analyze usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
            <p>
              We use your information to:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Provide, operate, and maintain the {APP_NAME} platform</li>
              <li>Process appointments, send notifications, and facilitate communication — including sharing your email address with confirmed appointment co-participants for direct communication about that appointment</li>
              <li>Process payments and subscriptions (via Lemon Squeezy)</li>
              <li>Improve our services, develop new features, and troubleshoot issues</li>
              <li>Send account-related emails (confirmations, password resets, policy updates)</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Data Sharing and Third-Party Processors</h2>
            <p>
              We do not sell your personal information. We share data only with trusted third-party service providers necessary to operate {APP_NAME}:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li><strong>Supabase:</strong> Our backend infrastructure provider (database, authentication, and storage). Supabase complies with GDPR and industry-standard security practices.</li>
              <li><strong>Lemon Squeezy:</strong> Our payment processor (merchant of record). Lemon Squeezy handles all payment transactions and is responsible for payment data security and compliance.</li>
              <li><strong>Analytics Providers:</strong> We may use privacy-respecting analytics tools to understand usage patterns (IP addresses are anonymized where possible).</li>
            </ul>
            {/* Burke: disclosed appointment-participant email sharing and scope of email_public toggle — required by GDPR transparency obligation */}
            <p className="mt-2">
              <strong>Appointment Co-Participants:</strong> When you share a confirmed appointment with another user, your email address is made visible to that co-participant (e.g., a provider can see a customer's email and vice versa) on the appointments page to enable direct communication about that appointment. This disclosure occurs automatically upon appointment confirmation and cannot be disabled on a per-appointment basis. It is independent of your <em>Show email on public profile</em> setting, which only controls whether your email is displayed on your public-facing profile page — it does not affect appointment-participant sharing. GDPR lawful basis: performance of a contract (Art. 6(1)(b)). For users in Canada (PIPEDA): email sharing is based on implied consent through the act of booking or accepting an appointment, consistent with PIPEDA's consent requirements for disclosure necessary to fulfill the appointment service.
            </p>
            <p className="mt-2">
              We may also disclose information if required by law, to protect our rights, or in connection with a business transfer (merger, acquisition, or sale).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for legal compliance, fraud prevention, or dispute resolution. Appointment history may be retained for operational and tax purposes. You can request deletion of your data at any time (see Section 7).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including encryption (HTTPS), secure authentication, and access controls. However, no system is completely secure, and we cannot guarantee absolute security. You are responsible for keeping your account credentials confidential.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Maintain user sessions (essential cookies)</li>
              <li>Remember user preferences (e.g., theme, language)</li>
              <li>Analyze site usage and performance (analytics cookies)</li>
            </ul>
            <p className="mt-2">
              You can configure your browser to reject cookies, but this may affect platform functionality. We do not use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Your Rights (GDPR and Data Protection)</h2>
            <p>
              If you are located in the European Economic Area or other jurisdictions with data protection laws, you have the following rights:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request corrections to inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities (e.g., marketing communications)</li>
              <li><strong>Withdrawal of Consent:</strong> Withdraw consent for data processing where consent was the legal basis</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at support@pikappoint.com. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. By using {APP_NAME}, you consent to such transfers. We ensure appropriate safeguards (e.g., standard contractual clauses) are in place when transferring data internationally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">9. Children's Privacy</h2>
            <p>
              {APP_NAME} is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or prominent notice on the platform. Your continued use after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">11. Contact</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us at:
            </p>
            <p className="mt-2">
              Email: support@pikappoint.com
            </p>
          </section>

          <footer className="mt-8 pt-4 border-t space-y-2">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link to={ROUTES.auth} className="hover:underline">
                Back to Sign In
              </Link>
              <Link to={ROUTES.dashboard} className="hover:underline">
                Dashboard
              </Link>
            </div>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}
