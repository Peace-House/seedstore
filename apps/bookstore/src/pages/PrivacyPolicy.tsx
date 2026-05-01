import { ShieldCheck } from 'lucide-react'

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="border-primary/20 mx-auto max-w-4xl rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-primary/10 text-primary rounded-full p-2">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">Privacy Policy</h1>
        </div>

        <p className="text-muted-foreground mb-6 text-sm">
          Last updated: May 1, 2026
        </p>

        <div className="space-y-6 text-sm leading-7 md:text-base">
          <section>
            <h2 className="mb-2 text-lg font-semibold">1. Who We Are</h2>
            <p>
              Livingseed Community provides SeedStore, an online platform for
              discovering, purchasing, and reading digital Christian resources.
              This policy explains what information we collect, why we collect
              it, and how we protect it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              2. Information We Collect
            </h2>
            <p className="mb-2">We may collect:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Account information such as name, email, PH-Code, and password.
              </li>
              <li>
                Profile and usage data such as preferred country/currency and
                app settings.
              </li>
              <li>
                Transaction data such as purchased books, payment references,
                and order history.
              </li>
              <li>Support and communication data when you contact us.</li>
              <li>
                Technical data such as device/session details used for security
                and troubleshooting.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>To create and manage your account.</li>
              <li>To process payments and deliver purchased content.</li>
              <li>
                To secure accounts, prevent fraud, and monitor suspicious
                activity.
              </li>
              <li>
                To improve product quality, customer support, and platform
                performance.
              </li>
              <li>
                To send service messages and optional newsletters where
                permitted.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">4. Payments</h2>
            <p>
              Payments are processed through trusted payment providers. We do
              not store full card details on SeedStore servers. We store
              transaction references and related purchase records required for
              fulfillment, support, and reconciliation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">5. Data Sharing</h2>
            <p>
              We do not sell personal data. We may share limited information
              with service providers that help us operate SeedStore (such as
              payment, email, infrastructure, and analytics partners) under
              confidentiality and security obligations.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">6. Security</h2>
            <p>
              We apply reasonable administrative and technical safeguards to
              protect personal information. While no system can be guaranteed
              100% secure, we continuously improve controls to reduce risk.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">7. Your Choices</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>You can update parts of your profile in account settings.</li>
              <li>You can unsubscribe from non-essential marketing emails.</li>
              <li>You may request account/data support by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">8. Contact</h2>
            <p>
              For privacy-related questions, contact us at{' '}
              <a
                className="text-primary underline"
                href="mailto:info@livingseed.org"
              >
                info@livingseed.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
