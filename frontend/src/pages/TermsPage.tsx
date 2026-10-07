import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  //CardDescription,
  //CardHeader,
  // CardTitle,
} from "./ui/card";

export function TermsPage() {
  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground mt-1">
              Last updated: January 4, 2026
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <section>
              <h2 className="mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using RetailLocator ("the Service"), you agree
                to be bound by these Terms of Service. If you do not agree to
                these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="mb-3">2. Use of Service</h2>
              <p className="text-muted-foreground mb-3">
                RetailLocator grants you a limited, non-exclusive,
                non-transferable license to use the Service for your business
                purposes, subject to these terms:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>You must be at least 18 years old to use this Service</li>
                <li>
                  You are responsible for maintaining the confidentiality of
                  your account
                </li>
                <li>
                  You agree not to misuse the Service or help anyone else do so
                </li>
                <li>You will not use the Service for any illegal purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3">3. Data and Privacy</h2>
              <p className="text-muted-foreground">
                Your use of RetailLocator is also governed by our Privacy
                Policy. We collect and process data as described in our Privacy
                Policy. You retain all rights to your data, and we will not sell
                or share your data with third parties without your consent.
              </p>
            </section>

            <section>
              <h2 className="mb-3">4. Account Responsibilities</h2>
              <p className="text-muted-foreground mb-3">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>
                  Ensuring all information you provide is accurate and
                  up-to-date
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3">5. Subscription and Payment</h2>
              <p className="text-muted-foreground">
                Some features of RetailLocator require a paid subscription. By
                subscribing, you agree to pay all applicable fees. Subscriptions
                automatically renew unless cancelled before the renewal date.
                Refunds are subject to our refund policy.
              </p>
            </section>

            <section>
              <h2 className="mb-3">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Service and its original content, features, and
                functionality are owned by RetailLocator and are protected by
                international copyright, trademark, patent, trade secret, and
                other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="mb-3">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                RetailLocator shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages resulting from your
                use or inability to use the Service. Our total liability shall
                not exceed the amount you paid for the Service in the 12 months
                prior to the event giving rise to the liability.
              </p>
            </section>

            <section>
              <h2 className="mb-3">8. Service Modifications</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify or discontinue the Service at any
                time, with or without notice. We shall not be liable to you or
                any third party for any modification, suspension, or
                discontinuance of the Service.
              </p>
            </section>

            <section>
              <h2 className="mb-3">9. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account and access to the
                Service immediately, without prior notice, for any breach of
                these Terms. Upon termination, your right to use the Service
                will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="mb-3">10. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to update these Terms at any time. We will
                notify you of any changes by posting the new Terms on this page
                and updating the "Last updated" date. Your continued use of the
                Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3">11. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance
                with the laws of the State of New York, United States, without
                regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="mb-3">12. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us
                at:
                <br />
                Email: legal@retaillocator.com
                <br />
                Phone: +1 (800) 123-4567
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
