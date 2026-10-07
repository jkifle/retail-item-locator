import { Shield } from "lucide-react";
import { Card, CardContent } from "./ui/card";

export function PrivacyPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground mt-1">
            Last updated: January 4, 2026
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <section>
            <h2 className="mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              RetailLocator ("we," "our," or "us") is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our retail
              item locator service.
            </p>
          </section>

          <section>
            <h2 className="mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">
              We collect several types of information:
            </p>

            <h3 className="mb-2 mt-4">Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Name and contact information (email, phone number)</li>
              <li>Company name and business information</li>
              <li>Account credentials and login information</li>
              <li>Payment and billing information</li>
            </ul>

            <h3 className="mb-2 mt-4">Business Data</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Item SKUs, names, and descriptions</li>
              <li>Store locations and inventory data</li>
              <li>Product location information (aisle, shelf, quantities)</li>
              <li>CSV files and imported data</li>
            </ul>

            <h3 className="mb-2 mt-4">Usage Information</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Log data and analytics</li>
              <li>Device information and IP addresses</li>
              <li>Browser type and operating system</li>
              <li>Pages visited and features used</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-3">
              We use collected information for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Providing and maintaining our Service</li>
              <li>Processing your transactions and managing subscriptions</li>
              <li>Sending you updates, notifications, and support messages</li>
              <li>Improving our Service and developing new features</li>
              <li>Analyzing usage patterns and optimizing performance</li>
              <li>Preventing fraud and ensuring security</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground mb-3">
              We do not sell your personal information. We may share your
              information only in these circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>With your explicit consent</li>
              <li>
                With service providers who assist in operating our Service
              </li>
              <li>To comply with legal obligations or court orders</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>
                In connection with a merger, acquisition, or sale of assets
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your
              information, including encryption, secure servers, and access
              controls. However, no method of transmission over the Internet is
              100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your information for as long as your account is active
              or as needed to provide you services. If you close your account,
              we will delete or anonymize your information within 90 days,
              unless we are required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Access and review your personal information</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
              <li>Object to certain processing of your data</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise these rights, please contact us at
              privacy@retaillocator.com
            </p>
          </section>

          <section>
            <h2 className="mb-3">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use cookies and similar tracking technologies to enhance your
              experience, analyze usage, and personalize content. You can
              control cookie preferences through your browser settings, though
              some features may not function properly if cookies are disabled.
            </p>
          </section>

          <section>
            <h2 className="mb-3">9. Third-Party Services</h2>
            <p className="text-muted-foreground">
              Our Service may contain links to third-party websites or integrate
              with third-party services. We are not responsible for the privacy
              practices of these third parties. We encourage you to review their
              privacy policies.
            </p>
          </section>

          <section>
            <h2 className="mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our Service is not intended for children under 13 years of age. We
              do not knowingly collect personal information from children. If
              you believe we have collected information from a child, please
              contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="mb-3">11. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be transferred to and processed in countries
              other than your own. We ensure appropriate safeguards are in place
              to protect your information in accordance with this Privacy
              Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will
              notify you of any significant changes by posting the new policy on
              this page and updating the "Last updated" date. We encourage you
              to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions or concerns about this Privacy Policy,
              please contact us:
              <br />
              Email: privacy@retaillocator.com
              <br />
              Phone: +1 (800) 123-4567
              <br />
              Address: 123 Business Street, Suite 400, New York, NY 10001
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
