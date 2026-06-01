{/* TODO: Have a lawyer review before relying on this for jurisdictional compliance. */}
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { APP_NAME } from '@/config/app';
import { ROUTES } from '@/config/routes';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: May 13, 2026</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <p>
              Welcome to {APP_NAME}. By accessing or using our appointment scheduling platform, you agree to be bound by these Terms of Service. Please read them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating an account, booking appointments, or using any features of {APP_NAME}, you acknowledge that you have read, understood, and agree to these Terms of Service, our Privacy Policy, and our Refund Policy. If you do not agree, you may not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Service Description</h2>
            <p>
              {APP_NAME} is a SaaS appointment scheduling platform that connects service providers with customers. We facilitate booking, calendar management, and payment processing through third-party payment providers (Lemon Squeezy). Subscriptions are sold on a recurring basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate, current information during registration and keep your profile up to date. You must notify us immediately of any unauthorized access or security breach.
            </p>
            {/* Burke: added email-visibility consent clause per May 2026 appointment contact-info feature */}
            <p className="mt-2">
              By booking or accepting an appointment with another user, you acknowledge that your email address will be shared with your appointment co-participant (provider or customer) for the purpose of direct communication about that appointment. This sharing is a core feature of the appointment service and occurs regardless of your public profile email visibility setting. See our <Link to={ROUTES.privacy} className="text-primary hover:underline">Privacy Policy</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Prohibited Use</h2>
            {/* Burke 2026-05-12: Added payment-processor-required prohibitions for Lemon Squeezy compliance */}
            <p>
              You agree not to use {APP_NAME} to:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Send spam, unsolicited messages, or automated booking requests</li>
              <li>Offer illegal services or conduct fraudulent activities</li>
              <li>Offer services involving weapons, adult content, gambling, or other prohibited business categories under payment processor policies</li>
              <li>Harass, threaten, or abuse other users or service providers</li>
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Attempt to interfere with, compromise, or reverse-engineer the platform</li>
              <li>Infringe on intellectual property rights, including through unauthorized use of copyrighted images, text, or trademarks</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these prohibitions without prior notice or refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Payment and Subscriptions</h2>
            {/* Burke 2026-05-12: Clarified that subscriptions are non-refundable to align with Refund Policy */}
            <p>
              Subscription fees are processed through Lemon Squeezy, our merchant of record. By subscribing, you authorize recurring charges to your payment method. Subscription fees are billed in advance on a monthly or annual basis, as selected. <strong>All subscription purchases are non-refundable except where required by law or at Lemon Squeezy's sole discretion as merchant of record.</strong> See our <Link to={ROUTES.refund} className="text-primary hover:underline">Refund Policy</Link> and <a href="https://www.lemonsqueezy.com/buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Lemon Squeezy's Buyer Terms</a> for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Service Availability</h2>
            <p>
              While we strive for high availability, {APP_NAME} is provided on an "as-is" and "as-available" basis. We do not guarantee uninterrupted, error-free, or secure operation. We may temporarily suspend access for maintenance, updates, or unforeseen technical issues. We are not liable for any losses resulting from service downtime or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. User Content and Data</h2>
            {/* Burke 2026-05-12: Added DMCA contact for user-generated content takedown requests */}
            <p>
              You retain ownership of any content or data you submit to {APP_NAME} (such as profile information, appointment details, or photos). By submitting content, you grant us a worldwide, non-exclusive license to use, display, and process your content to provide and improve our services. You are solely responsible for the accuracy and legality of your content.
            </p>
            <p className="mt-2">
              If you believe content on {APP_NAME} infringes your intellectual property rights (including copyrighted profile photos or service descriptions), please submit a takedown request to pikappoint@gmail.com with details of the infringing material and your ownership claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Intellectual Property</h2>
            <p>
              All rights, title, and interest in {APP_NAME} (including software, design, trademarks, and content) are owned by us or our licensors. You may not copy, modify, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, {APP_NAME} and its affiliates, officers, and employees shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability for any claim shall not exceed the amount you paid us in the twelve months prior to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {APP_NAME}, its affiliates, and personnel from any claims, losses, or expenses (including legal fees) arising from your use of the platform, your violation of these Terms, or your infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">11. Termination</h2>
            <p>
              We may terminate or suspend your access to {APP_NAME} at any time, with or without cause, with or without notice. You may cancel your account at any time through your account settings. Upon termination, your right to use the platform ceases immediately. We are not obligated to retain your data after termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">12. Governing Law and Disputes</h2>
            {/* Hicks 2026-05-12: Burke's Delaware rationale was rejected — LemonSqueezy is a Utah LLC, not Delaware. Jurisdiction corrected to Province of British Columbia, Canada (Steve confirmed PikAppoint is BC-based, not yet incorporated). Update this if you incorporate in a different province. */}
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Province of British Columbia and the applicable laws of Canada, without regard to conflict of law principles. Any disputes arising from these Terms or your use of {APP_NAME} shall be resolved through binding arbitration or in the courts of British Columbia, Canada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">13. Changes to Terms</h2>
            <p>
              We reserve the right to update or modify these Terms at any time. We will notify users of material changes by email or prominent notice on the platform. Your continued use after such changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">14. Contact</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at pikappoint@gmail.com.
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
