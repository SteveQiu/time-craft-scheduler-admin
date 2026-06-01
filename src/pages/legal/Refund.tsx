{/* TODO: Have a lawyer review before relying on this for jurisdictional compliance. */}
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { APP_NAME } from '@/config/app';
import { ROUTES } from '@/config/routes';

export default function Refund() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Refund Policy</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: May 12, 2026</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Burke 2026-05-12: Replaced Ripley's 7-day money-back template with canonical no-refunds policy per Steve directive */}
          <section>
            <p>
              This Refund Policy governs subscription purchases on {APP_NAME}. Please read carefully before subscribing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. All Sales Final — No Refunds</h2>
            <p>
              <strong>All subscription purchases on {APP_NAME} are FINAL. We do not offer refunds, credits, or prorated refunds for any subscription fees paid, regardless of usage or cancellation timing.</strong>
            </p>
            <p className="mt-2">
              By subscribing to {APP_NAME} Premium, you acknowledge and agree that all charges are non-refundable once processed. This policy applies to monthly and annual subscriptions, first-time purchases, renewals, and upgrades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Statutory Consumer Rights</h2>
            {/* Burke 2026-05-12: Added carve-out for mandatory consumer refund rights per charter requirement */}
            <p>
              While our general policy is no refunds, certain consumer protection laws may grant you statutory refund rights that cannot be waived by this policy. These rights vary by jurisdiction and may include:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li><strong>European Union:</strong> Right of withdrawal (14 days for distance contracts under EU Consumer Rights Directive 2011/83/EU, Article 16(m)). You waive this right when: (1) you give <strong>prior express consent</strong> for immediate access to digital content, AND (2) you <strong>acknowledge that you lose your right of withdrawal</strong> by giving that consent.</li>
              <li><strong>United Kingdom:</strong> 14-day cooling-off period under Consumer Contracts Regulations 2013, Regulation 37. You lose this right if: (1) you give <strong>prior express consent</strong> to immediate access, AND (2) you <strong>acknowledge that you lose your right to cancel</strong>, AND (3) we provide confirmation of your consent and acknowledgment.</li>
              <li><strong>Australia:</strong> Non-excludable guarantees under the Australian Consumer Law, including rights to refund for major failures in service quality.</li>
            </ul>
            <p className="mt-2">
              If you believe you have a statutory right to a refund under local consumer protection law, please contact us at pikappoint@gmail.com with details of your jurisdiction and the legal basis for your claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Subscription Cancellation</h2>
            <p>
              You may cancel your subscription at any time through your account settings. Cancellation stops future billing, but <strong>does not refund the current billing period</strong>. You will retain access to {APP_NAME} Premium until the end of your current paid period.
            </p>
            <p className="mt-2">
              <strong>Example:</strong> If your subscription renews on the 1st of each month and you cancel on the 15th, you will keep Premium access until the end of the month. You will not be charged again, but no refund will be issued for the unused days.
            </p>
            <p className="mt-2">
              To cancel, navigate to: <Link to={ROUTES.settings} className="text-primary hover:underline">Settings → Subscription</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Billing Disputes and Payment Errors</h2>
            {/* Burke 2026-05-12: Kept billing error clause, clarified Lemon Squeezy merchant-of-record role */}
            <p>
              If you believe you have been charged in error (e.g., duplicate charges, charges after cancellation, or unauthorized transactions), please contact us immediately at pikappoint@gmail.com. We will investigate and work with our payment processor to resolve legitimate billing errors.
            </p>
            <p className="mt-2">
              All payments are processed by <strong>Lemon Squeezy</strong>, our merchant of record. Lemon Squeezy handles payment data, transaction processing, and dispute resolution. For payment-specific disputes, you may also contact Lemon Squeezy directly through their support channels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Account Termination</h2>
            <p>
              If your account is terminated by {APP_NAME} for violations of our Terms of Service (e.g., fraudulent activity, abuse, or prohibited use), no refund will be issued, regardless of when the termination occurs within your billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Changes to This Refund Policy</h2>
            <p>
              We reserve the right to modify this Refund Policy at any time. Material changes will be communicated via email or prominent notice on the platform. Your continued use of {APP_NAME} after policy changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Contact</h2>
            <p>
              If you have questions about this Refund Policy or believe you have a legitimate refund claim, please contact us at:
            </p>
            <p className="mt-2">
              Email: <strong>pikappoint@gmail.com</strong>
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
