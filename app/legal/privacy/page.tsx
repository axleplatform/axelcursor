"use client"

import { TableOfContents } from "@/components/table-of-contents"

export default function PrivacyPolicyPage() {
  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "information-we-collect", title: "1. Information We Collect" },
    { id: "how-we-use", title: "2. How We Use Your Information" },
    { id: "search-query", title: "2.1 Search Query Collection" },
    { id: "how-we-share", title: "3. How We Share Your Information" },
    { id: "your-choices", title: "4. Your Choices & Rights" },
    { id: "data-security", title: "5. Data Security & Retention" },
    { id: "third-party-links", title: "6. Third-Party Links" },
    { id: "third-party-services", title: "7. Third-Party Services" },
    { id: "changes", title: "8. Changes to Policy" },
    { id: "contact-us", title: "9. Contact Us" },
  ]

  return (
    <div className="py-8">
      <div className="container">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-2">Effective Date: March 28th, 2025</p>
        <p className="text-sm text-gray-500 mb-6">Last Updated: March 28th, 2025</p>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Table of Contents - Hidden on mobile, shown on tablet and up */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <TableOfContents sections={sections} />
          </div>

          {/* Mobile Table of Contents - Shown only on mobile */}
          <div className="md:hidden mb-6">
            <details className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <summary className="text-lg font-semibold cursor-pointer">Table of Contents</summary>
              <nav className="mt-3 space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block px-3 py-2 text-sm rounded-md text-gray-600 hover:bg-gray-100"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </details>
          </div>

          {/* Main Content */}
          <div className="flex-1 legal-document">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div id="introduction" className="space-y-4 mb-8">
                <p className="text-gray-600">
                  Axle ("we," "us," or "our") respects your privacy and is committed to protecting your personal data.
                  This Privacy Policy explains how we collect, use, disclose, and protect your information when you
                  access and use our platform, which connects customers ("Users") with independent mobile mechanics
                  ("Mechanics").
                </p>
                <p className="text-gray-600">
                  By using our services, you agree to the terms of this Privacy Policy. If you do not agree, please
                  refrain from using our platform.
                </p>
              </div>

              <section id="information-we-collect" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">1. Information We Collect</h2>
                <p className="text-gray-600 mb-3">
                  We collect different types of information to provide and improve our services, including:
                </p>

                <h3 className="text-lg font-medium text-gray-800 mb-2">1.1 Information You Provide to Us</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>
                    <strong>Account Information:</strong> When you register, we collect details such as your name, email
                    address, phone number, password, and payment details (for Users).
                  </li>
                  <li>
                    <strong>Profile Information:</strong> Mechanics may provide additional details like certifications,
                    experience, pricing, and availability.
                  </li>
                  <li>
                    <strong>Service Requests and Transactions:</strong> We collect details about services booked,
                    accepted, and completed through our platform.
                  </li>
                  <li>
                    <strong>Customer Support:</strong> If you contact us, we collect information regarding your inquiry
                    and correspondence with us.
                  </li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">1.2 Information Collected Automatically</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>
                    <strong>Usage Data:</strong> We collect information about your interactions with the platform, such
                    as pages visited, time spent, and actions taken.
                  </li>
                  <li>
                    <strong>Device Information:</strong> We collect data such as IP addresses, browser type, device
                    type, and operating system.
                  </li>
                  <li>
                    <strong>Location Data:</strong> If you enable location services, we collect real-time GPS or
                    approximate location data to match Users with nearby Mechanics.
                  </li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">1.3 Information from Third Parties</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    <strong>Background Checks:</strong> We may collect information from third-party providers to verify
                    Mechanics' qualifications, identity, and criminal history where permitted by law.
                  </li>
                  <li>
                    <strong>Payment Processors:</strong> When Users make payments, we collect transaction details from
                    third-party payment processors.
                  </li>
                  <li>
                    <strong>Marketing & Analytics Providers:</strong> We may receive aggregated insights from marketing
                    and analytics partners.
                  </li>
                </ul>
              </section>

              <section id="how-we-use" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">2. How We Use Your Information</h2>
                <p className="text-gray-600 mb-3">We use the information we collect to:</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Provide, maintain, and improve our platform and services.</li>
                  <li>Connect Users with Mechanics based on location, availability, and service needs.</li>
                  <li>Process payments and transactions securely.</li>
                  <li>Verify Mechanics' credentials and ensure compliance with our policies.</li>
                  <li>Communicate with you regarding account updates, service requests, and customer support.</li>
                  <li>
                    Send promotional offers, newsletters, and service recommendations (you can opt out at any time).
                  </li>
                  <li>Prevent fraud, ensure platform security, and enforce our Terms & Conditions.</li>
                </ul>
              </section>

              <section id="search-query" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">2.1 Search Query Collection and Usage</h2>
                <p className="text-gray-600 mb-3">
                  When you use our help center search functionality, we collect and store your search queries to improve
                  our services:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    <strong>Search Queries:</strong> We collect the text of your search queries to understand what
                    information our users are looking for and improve our help center content.
                  </li>
                  <li>
                    <strong>Data Retention:</strong> Search queries are stored anonymously and automatically deleted
                    after 90 days.
                  </li>
                  <li>
                    <strong>Usage Limitations:</strong> We use this data solely to improve our help center content and
                    search functionality. We do not use it for advertising or share it with third parties.
                  </li>
                </ul>
                <p className="text-gray-600 mt-3">
                  <strong>Data Protection:</strong> All search data is anonymized before storage. We implement technical
                  safeguards including data encryption and automatic deletion after the retention period.
                </p>
              </section>

              <section id="how-we-share" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">3. How We Share Your Information</h2>
                <p className="text-gray-600 mb-3">
                  We do not sell or rent your personal information. However, we may share it in the following
                  situations:
                </p>

                <h3 className="text-lg font-medium text-gray-800 mb-2">3.1 With Service Providers & Partners</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>
                    <strong>Payment Processors:</strong> To facilitate transactions.
                  </li>
                  <li>
                    <strong>Background Check Providers:</strong> To verify Mechanics' credentials and eligibility.
                  </li>
                  <li>
                    <strong>Marketing & Analytics Services:</strong> To improve platform performance and user
                    experience.
                  </li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">3.2 With Other Users</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>
                    Mechanics will see relevant details about service requests (e.g., User's location, vehicle details).
                  </li>
                  <li>Users will see Mechanics' profiles, ratings, and contact information upon booking.</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">3.3 Legal & Safety Compliance</h3>
                <p className="text-gray-600 mb-4">
                  We may share information when required by law, such as in response to legal requests, subpoenas, or
                  investigations into fraud or security threats.
                </p>

                <h3 className="text-lg font-medium text-gray-800 mb-2">3.4 Business Transfers</h3>
                <p className="text-gray-600">
                  If our company undergoes a merger, acquisition, or asset sale, your information may be transferred to
                  the new entity.
                </p>
              </section>

              <section id="your-choices" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">4. Your Choices & Rights</h2>

                <h3 className="text-lg font-medium text-gray-800 mb-2">4.1 Account & Communication Preferences</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>You can update or delete your account information through your profile settings.</li>
                  <li>You can opt out of marketing emails via the unsubscribe link in our messages.</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">4.2 Location & Data Collection Controls</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>
                    You can disable location services in your device settings, but this may limit service functionality.
                  </li>
                  <li>You can control cookies and tracking settings through your browser preferences.</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">4.3 Data Deletion & Access Requests</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>You have the right to request access, correction, or deletion of your personal data.</li>
                  <li>
                    To make a request, contact us at{" "}
                    <a href="mailto:axleplatform@gmail.com" className="text-[#294a46] hover:underline">
                      axleplatform@gmail.com
                    </a>
                  </li>
                </ul>
              </section>

              <section id="data-security" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">5. Data Security & Retention</h2>
                <p className="text-gray-600 mb-3">
                  We implement security measures to protect your data from unauthorized access and breaches. However, no
                  system is completely secure. If a data breach occurs, we will notify affected Users as required by
                  law.
                </p>
                <p className="text-gray-600">
                  We retain your data as long as necessary for business purposes or legal compliance. When no longer
                  needed, we delete or anonymize your information.
                </p>
              </section>

              <section id="third-party-links" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">6. Third-Party Links & Services</h2>
                <p className="text-gray-600">
                  Our platform may contain links to third-party websites or services. This Privacy Policy does not apply
                  to external sites, and we are not responsible for their privacy practices.
                </p>
              </section>

              <section id="third-party-services" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">7. Third-Party Services and Data Processing</h2>
                <p className="text-gray-600 mb-3">
                  Our platform is built using various third-party services and technologies, including:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    <strong>Vercel:</strong> We use Vercel for hosting and deployment of our platform. Vercel may
                    collect and process certain data as described in their{" "}
                    <a
                      href="https://vercel.com/legal/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </li>
                  <li>
                    <strong>Google Maps API:</strong> We use Google Maps API for location-based services. Google may
                    collect and process location data and other information as described in their{" "}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </li>
                  <li>
                    <strong>Supabase:</strong> We use Supabase for database services. Supabase may collect and process
                    certain data as described in their{" "}
                    <a
                      href="https://supabase.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </li>
                  <li>
                    <strong>Stripe:</strong> We use Stripe for payment processing. Stripe may collect and process
                    payment information as described in their{" "}
                    <a
                      href="https://stripe.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#294a46] hover:underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </li>
                </ul>
                <p className="text-gray-600 mt-3">
                  By using our platform, you acknowledge and agree that your data may be processed by these third-party
                  services in accordance with their respective privacy policies. We encourage you to review these
                  policies to understand how your data is processed by these services.
                </p>
              </section>

              <section id="changes" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">8. Changes to This Privacy Policy</h2>
                <p className="text-gray-600">
                  We may update this Privacy Policy periodically. If significant changes are made, we will notify you
                  through the platform or via email. Continued use of our services after changes means you accept the
                  updated terms.
                </p>
              </section>

              <section id="contact-us" className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-3">9. Contact Us</h2>
                <p className="text-gray-600">
                  If you have questions about this Privacy Policy, contact us at:
                  <br />
                  Axle
                  <br />
                  <a href="mailto:axleplatform@gmail.com" className="text-[#294a46] hover:underline">
                    axleplatform@gmail.com
                  </a>
                </p>
              </section>

              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-gray-600 font-medium">
                  By using our platform, you acknowledge that you have read, understood, and agreed to this Privacy
                  Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
