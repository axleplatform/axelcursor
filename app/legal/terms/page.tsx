import { TableOfContents } from "@/components/table-of-contents"

export default function TermsOfServicePage() {
  const sections = [
    { id: "scope", title: "1. Scope of Services" },
    { id: "accounts", title: "2. User Accounts" },
    { id: "usage", title: "3. Platform Usage & Service Agreement" },
    { id: "payment", title: "4. Payment & Fees" },
    { id: "cancellation", title: "5. Cancellations and Refunds" },
    { id: "responsibility", title: "6. Responsibilities and Liability" },
    { id: "prohibited", title: "7. Prohibited Activities" },
    { id: "intellectual", title: "8. Intellectual Property & Confidentiality" },
    { id: "data-collection", title: "8.1 Data Collection and Analytics" },
    { id: "limitation", title: "9. Limitation of Liability" },
    { id: "disclaimer", title: "10. Liability Disclaimer" },
    { id: "indemnification", title: "11. Indemnification" },
    { id: "circumvention", title: "12. Non-Circumvention Policy" },
    { id: "termination", title: "13. Termination" },
    { id: "privacy", title: "14. Privacy Policy" },
    { id: "changes", title: "15. Changes to These Terms" },
    { id: "contact", title: "16. Contact Information" },
    { id: "third-party", title: "17. Third-Party Services" },
  ]

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/4 md:block">
          <div className="md:sticky md:top-24">
            <TableOfContents sections={sections} />
          </div>
        </div>
        <div className="md:w-3/4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms and Conditions</h1>
            <p className="text-sm text-gray-500 mb-6">Last Updated: March 28, 2025</p>

            <div className="space-y-8">
              <p className="text-gray-600">
                Welcome to Axle! ("axle", "Company", "we", "us", or "our"). These Terms and Conditions ("Terms") govern
                your use of our platform ("Platform"), which connects customers ("Customers") with independent mobile
                mechanics ("Mechanics") for vehicle repair and maintenance services. By accessing or using our Platform,
                you agree to these Terms. If you do not agree, do not use the Platform.
              </p>

              <section id="scope">
                <h2 className="text-xl font-medium text-gray-900 mb-3">1. Scope of Services</h2>
                <p className="text-gray-600">
                  Axle provides an online marketplace that facilitates transactions between Customers and Mechanics. We
                  do not perform any mechanical work, nor do we employ Mechanics. The Company is solely a technology
                  provider connecting Customers with independent Mechanics.
                </p>
              </section>

              <section id="accounts">
                <h2 className="text-xl font-medium text-gray-900 mb-3">2. User Accounts</h2>
                <h3 className="text-lg font-medium text-gray-800 mb-2">A. Eligibility</h3>
                <p className="text-gray-600 mb-3">
                  To use the Platform, you must be at least 18 years old and legally capable of entering into a binding
                  contract.
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>Users must provide accurate information during registration.</li>
                  <li>
                    Mechanics must complete background checks and verification (including driver's license, SSN, and
                    certifications).
                  </li>
                  <li>Mechanics must pass verification (ID, driver's license, certifications) to accept jobs.</li>
                  <li>Providing false information will result in account suspension.</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">B. Account Registration</h3>
                <p className="text-gray-600">
                  Customers and Mechanics must create an account to use the Platform. You agree to provide accurate,
                  complete, and updated information. You are responsible for maintaining the confidentiality of your
                  account credentials.
                </p>
              </section>

              <section id="usage">
                <h2 className="text-xl font-medium text-gray-900 mb-3">3. Platform Usage & Service Agreement</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    The Platform only facilitates connections between Customers and Mechanics; we do not employ
                    Mechanics.
                  </li>
                  <li>Users are responsible for negotiating service terms and ensuring quality.</li>
                  <li>Mechanics are independent contractors and not employees of the Platform.</li>
                  <li>Customers and Mechanics must comply with local laws regarding automotive repairs.</li>
                </ul>
              </section>

              <section id="payment">
                <h2 className="text-xl font-medium text-gray-900 mb-3">4. Payment and Fees</h2>
                <h3 className="text-lg font-medium text-gray-800 mb-2">A. Pricing</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>Mechanics set their own prices for services.</li>
                  <li>
                    Customers agree to pay the full amount upon booking or after service completion, depending on the
                    arrangement.
                  </li>
                  <li>Customers agree to pay the full service fee through the Platform (Stripe, PayPal, etc.)</li>
                  <li>
                    The Platform takes a 10% service fee from each transaction from mechanics and a service fee from
                    Users.
                  </li>
                  <li>
                    Refunds and disputes are handled on a case-by-case basis via the Dispute Resolution Policy (Section
                    6.C, and 9).
                  </li>
                  <li>Mechanics are responsible for their own taxes, licenses, and insurance.</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">B. Payment Processing</h3>
                <p className="text-gray-600 mb-4">
                  Payments are processed through third-party providers. By using the Platform, you agree to their terms
                  and conditions. Axle is not responsible for payment processing errors or issues.
                </p>

                <h3 className="text-lg font-medium text-gray-800 mb-2">C. Fees</h3>
                <p className="text-gray-600">
                  Axle may charge a service fee for using the Platform. This fee will be disclosed before Customers
                  confirm a booking.
                </p>
              </section>

              <section id="cancellation">
                <h2 className="text-xl font-medium text-gray-900 mb-3">5. Cancellations and Refunds</h2>
                <h3 className="text-lg font-medium text-gray-800 mb-2">A. Customer Cancellations</h3>
                <p className="text-gray-600 mb-4">
                  Customers may cancel a request before a mechanic accepts the job without penalty. If a job is canceled
                  after acceptance, cancellation fees may apply. Customer Cancellations: Once a user and mechanic
                  accepts the terms and the User decides to cancel the job, the User is charged a 5% cancellation fee
                  from the price quoted.
                </p>

                <h3 className="text-lg font-medium text-gray-800 mb-2">B. Mechanic Cancellations</h3>
                <p className="text-gray-600 mb-4">
                  Mechanics may cancel a job under extenuating circumstances but excessive cancellations may result in
                  suspension from the Platform. Mechanics who cancel last-minute may face penalties or removal from the
                  Platform. Mechanics who cancel a job are bound to pay 5% of the job quote that they provided and greed
                  to from the Platform.
                </p>

                <h3 className="text-lg font-medium text-gray-800 mb-2">C. Refunds</h3>
                <p className="text-gray-600">
                  Refunds are subject to our discretion and depend on the nature of the dispute between the Customer and
                  the Mechanic.
                </p>
              </section>

              <section id="responsibility">
                <h2 className="text-xl font-medium text-gray-900 mb-3">6. Responsibilities and Liability</h2>
                <h3 className="text-lg font-medium text-gray-800 mb-2">A. Customer Responsibilities</h3>
                <p className="text-gray-600 mb-4">
                  Customers must provide accurate vehicle details and be present at the agreed location during service.
                  Axle is not responsible for any issues arising from incorrect information.
                </p>

                <h3 className="text-lg font-medium text-gray-800 mb-2">B. Mechanic Responsibilities</h3>
                <p className="text-gray-600 mb-4">
                  Mechanics agree to perform services professionally, comply with applicable laws, and carry necessary
                  certifications or licenses.
                </p>
                <p className="font-medium text-gray-800 mb-2">MECHANIC VERIFICATION & LIABILITY</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>Mechanics must pass ID, background, and certification checks before accepting jobs.</li>
                  <li>The Platform is not liable for damages, injuries, or issues caused by Mechanics.</li>
                  <li>Customers assume full responsibility for vetting Mechanics before hiring.</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">C. Dispute Resolution</h3>
                <p className="text-gray-600 mb-3">
                  Axle is not a party to service agreements between Customers and Mechanics. We encourage parties to
                  resolve disputes independently. If needed, we may provide limited dispute mediation.
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>Users must attempt to resolve disputes between themselves first.</li>
                  <li>
                    If unresolved, the Platform will review the dispute and may issue refunds, suspensions, or warnings.
                  </li>
                  <li>
                    Any disputes must be submitted via email:{" "}
                    <a href="mailto:axleplatform@gmail.com" className="text-[#294a46] hover:underline">
                      axleplatform@gmail.com
                    </a>{" "}
                    within 7 days of service completion.
                  </li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">D. Platform Role & Responsibilities</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    We provide the marketplace for Customers and Mechanics to connect but do not guarantee service
                    quality or performance.
                  </li>
                  <li>The Platform is not responsible for any damages, accidents, or disputes between Users.</li>
                  <li>The Platform is not responsible for any damages, accidents, or disputes between Mechanics.</li>
                  <li>
                    The Platform is not responsible for any damages, accidents, or disputes between Mechanics and Users.
                  </li>
                  <li>Mechanics are independent contractors, not employees.</li>
                </ul>
              </section>

              <section id="prohibited">
                <h2 className="text-xl font-medium text-gray-900 mb-3">7. Prohibited Activities</h2>
                <p className="text-gray-600 mb-3">Users may not:</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-3">
                  <li>Use the Platform for illegal activities or fraudulent transactions.</li>
                  <li>Harass, threaten, or discriminate against other Users.</li>
                  <li>Attempt to circumvent Platform fees by making payments outside the Platform.</li>
                  <li>Use fake profiles, misleading information, or impersonate others.</li>
                </ul>
                <p className="text-gray-600">Failure to comply will result in account suspension or legal action.</p>
              </section>

              <section id="intellectual">
                <h2 className="text-xl font-medium text-gray-900 mb-3">8. Intellectual Property & Confidentiality</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    All Platform branding, logos, and software are owned by Axle and may not be copied or used without
                    permission.
                  </li>
                  <li>
                    Any ideas, feedback, or improvements suggested by Users become the intellectual property of the
                    Platform.
                  </li>
                  <li>Mechanics agree to keep customer information confidential and not share or sell data.</li>
                </ul>
              </section>

              <section id="data-collection">
                <h2 className="text-xl font-medium text-gray-900 mb-3">8.1 Data Collection and Analytics</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    We collect and analyze usage data, including search queries, to improve our services and user
                    experience.
                  </li>
                  <li>All data collection is subject to user consent and our Privacy Policy.</li>
                  <li>
                    Users can opt out of optional data collection at any time without affecting core platform
                    functionality.
                  </li>
                  <li>We implement appropriate technical and organizational measures to protect all collected data.</li>
                </ul>
              </section>

              <section id="limitation">
                <h2 className="text-xl font-medium text-gray-900 mb-3">9. Limitation of Liability</h2>
                <p className="text-gray-600">
                  To the fullest extent permitted by law, Axle disclaims all liability for any indirect, incidental, or
                  consequential damages. Our total liability shall not exceed the amount paid by the Customer for the
                  specific service in dispute.
                </p>
              </section>

              <section id="disclaimer">
                <h2 className="text-xl font-medium text-gray-900 mb-3">10. Liability Disclaimer</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    The Platform is not liable for any damages, injuries, or losses resulting from services provided by
                    Mechanics.
                  </li>
                  <li>We do not guarantee service quality and act only as a connection platform.</li>
                  <li>In no event shall the Platform's total liability exceed $1 USD.</li>
                </ul>
              </section>

              <section id="indemnification">
                <h2 className="text-xl font-medium text-gray-900 mb-3">11. Indemnification</h2>
                <p className="text-gray-600">
                  You agree to indemnify and hold harmless Axle from any claims, damages, or liabilities arising from
                  your use of the Platform, violation of these Terms, or interaction with other users.
                </p>
              </section>

              <section id="circumvention">
                <h2 className="text-xl font-medium text-gray-900 mb-3">12. Non-Circumvention Policy</h2>
                <p className="text-gray-600 mb-3">To protect the integrity of the Platform:</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>Users and Mechanics agree NOT to complete transactions outside the Platform.</li>
                  <li>
                    If a User or Mechanic is found bypassing the Platform, they may face:
                    <ol className="list-decimal pl-6 mt-2 space-y-1">
                      <li>Account suspension or termination.</li>
                      <li>A circumvention fee equal to 20% of the estimated transaction value.</li>
                    </ol>
                  </li>
                  <li>
                    Mechanics cannot advertise external services (e.g., giving personal phone numbers to Customers).
                  </li>
                  <li>Mechanics and Customers agree not to bypass the Platform for service transactions.</li>
                  <li>Any services initiated on the Platform must be completed and paid through the Platform.</li>
                  <li>
                    If a Mechanic or Customer is found arranging payments or services outside of the Platform, their
                    account may be suspended, fined, or permanently removed.
                  </li>
                  <li>
                    The Platform reserves the right to charge a circumvention fee of 20% if a User violates this policy.
                  </li>
                  <li>
                    Mechanics who repeatedly attempt to take business off-platform may be subject to legal action for
                    lost revenue damages.
                  </li>
                </ul>
                <p className="text-gray-600 font-medium mb-2">How We Enforce This:</p>
                <ul className="list-none pl-6 text-gray-600 space-y-1">
                  <li>✓ AI-detection of off-platform contact attempts.</li>
                  <li>✓ User reporting system for violations.</li>
                </ul>
              </section>

              <section id="termination">
                <h2 className="text-xl font-medium text-gray-900 mb-3">13. Termination</h2>
                <p className="text-gray-600 mb-3">
                  We reserve the right to terminate or suspend your account at any time for violations of these Terms,
                  fraudulent activity, or other misconduct.
                </p>
                <p className="text-gray-600">
                  These Terms may be updated periodically, and continued use of the Platform constitutes agreement to
                  new Terms.
                </p>
              </section>

              <section id="privacy">
                <h2 className="text-xl font-medium text-gray-900 mb-3">14. Privacy Policy</h2>
                <p className="text-gray-600">
                  Your use of the Platform is also governed by our{" "}
                  <a href="/legal/privacy" className="text-[#294a46] hover:underline">
                    Privacy Policy
                  </a>
                  , which explains how we collect, use, and protect your information.
                </p>
              </section>

              <section id="changes">
                <h2 className="text-xl font-medium text-gray-900 mb-3">15. Changes to These Terms</h2>
                <p className="text-gray-600">
                  We may update these Terms from time to time. Your continued use of the Platform after changes become
                  effective constitutes acceptance of the revised Terms.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-xl font-medium text-gray-900 mb-3">16. Contact Information</h2>
                <p className="text-gray-600">
                  For questions or concerns regarding these Terms, please contact us at{" "}
                  <a href="mailto:axleplatform@gmail.com" className="text-[#294a46] hover:underline">
                    axleplatform@gmail.com
                  </a>
                </p>
              </section>

              <section id="third-party">
                <h2 className="text-xl font-medium text-gray-900 mb-3">17. Third-Party Services</h2>
                <p className="text-gray-600 mb-3">
                  Our Platform utilizes various third-party services and technologies, including but not limited to
                  Vercel for hosting, Google Maps API for location services, Supabase for database services, and Stripe
                  for payment processing.
                </p>
                <p className="text-gray-600 mb-3">By using our Platform, you acknowledge and agree that:</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    Your use of these third-party services is subject to their respective terms of service and privacy
                    policies.
                  </li>
                  <li>
                    We are not responsible for the content, privacy practices, or policies of these third-party
                    services.
                  </li>
                  <li>These third-party services may collect and process your data according to their own terms.</li>
                  <li>
                    Your continued use of our Platform constitutes your consent to the terms and policies of these
                    third-party services.
                  </li>
                </ul>
                <p className="text-gray-600 mt-3">
                  We encourage you to review the terms of service and privacy policies of these third-party services:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    <a
                      href="https://vercel.com/legal/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Vercel Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://policies.google.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Google Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://supabase.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Supabase Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://stripe.com/legal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Stripe Terms of Service
                    </a>
                  </li>
                </ul>
              </section>

              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-gray-600 font-medium">
                  By using our Platform, you acknowledge that you have read, understood, and agreed to these Terms and
                  Conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
