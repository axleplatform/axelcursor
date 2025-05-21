"use client"

import { TableOfContents } from "@/components/table-of-contents"

export default function CookiePolicyPage() {
  // Define the sections for the table of contents
  const sections = [
    { id: "introduction", title: "1. Introduction" },
    { id: "what-are-cookies", title: "2. What Are Cookies?" },
    { id: "types-of-cookies", title: "3. Types of Cookies We Use" },
    { id: "third-party-cookies", title: "4. Third-Party Cookies" },
    { id: "manage-cookies", title: "5. How to Manage Cookies" },
    { id: "changes", title: "6. Changes to This Cookie Policy" },
    { id: "contact-us", title: "7. Contact Us" },
  ]

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookie Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: March 28, 2025</p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Table of Contents Sidebar */}
        <aside className="md:w-64 flex-shrink-0">
          <TableOfContents sections={sections} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <section id="introduction">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600">
              This Cookie Policy explains how Axle ("we", "us", or "our") uses cookies and similar technologies on our
              website and mobile applications. This policy is designed to help you understand what cookies are, how we
              use them, and the choices you have regarding their use.
            </p>
          </section>

          <section id="what-are-cookies">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. What Are Cookies?</h2>
            <p className="text-gray-600">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit
              websites. They are widely used to make websites work more efficiently, provide a better user experience,
              and give website owners information about how their sites are used.
            </p>
          </section>

          <section id="types-of-cookies">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Types of Cookies We Use</h2>
            <p className="text-gray-600 mb-4">We use the following types of cookies on our platform:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3">
              <li>
                <strong>Essential Cookies:</strong> These cookies are necessary for the website to function properly.
                They enable basic functions like page navigation and access to secure areas of the website. The website
                cannot function properly without these cookies.
              </li>
              <li>
                <strong>Preference Cookies:</strong> These cookies allow the website to remember choices you make (such
                as your preferred language or the region you are in) and provide enhanced, more personal features.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> These cookies help us understand how visitors interact with our
                website by collecting and reporting information anonymously. This helps us improve our website and
                services.
              </li>
              <li>
                <strong>Marketing Cookies:</strong> These cookies are used to track visitors across websites. The
                intention is to display ads that are relevant and engaging for the individual user.
              </li>
            </ul>
          </section>

          <section id="third-party-cookies">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Third-Party Cookies</h2>
            <p className="text-gray-600 mb-4">
              In addition to our own cookies, we may also use various third-party cookies to report usage statistics of
              the service, deliver advertisements on and through the service, and so on. These cookies may be set by:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3">
              <li>Google Analytics</li>
              <li>Google Maps</li>
              <li>Stripe</li>
              <li>Vercel</li>
              <li>Supabase</li>
              <li>Other analytics and advertising partners</li>
            </ul>
            <p className="text-gray-600 mt-4">
              By using our platform, you acknowledge and agree that your data may be processed by these third-party
              services in accordance with their respective cookie policies. We encourage you to review these policies to
              understand how your data is processed.
            </p>
          </section>

          <section id="manage-cookies">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. How to Manage Cookies</h2>
            <p className="text-gray-600 mb-4">
              Most web browsers allow you to control cookies through their settings preferences. However, if you limit
              the ability of websites to set cookies, you may worsen your overall user experience, as it will no longer
              be personalized to you. It may also stop you from saving customized settings like login information.
            </p>
            <p className="text-gray-600 mb-4">
              To manage cookies in different browsers, please refer to the following links:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#294a46] hover:underline"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#294a46] hover:underline"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#294a46] hover:underline"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#294a46] hover:underline"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          <section id="changes">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Changes to This Cookie Policy</h2>
            <p className="text-gray-600">
              We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new
              Cookie Policy on this page and updating the "Last Updated" date at the top of this page. You are advised
              to review this Cookie Policy periodically for any changes.
            </p>
          </section>

          <section id="contact-us">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about our Cookie Policy, please contact us at{" "}
              <a href="mailto:axleplatform@gmail.com" className="text-[#294a46] hover:underline">
                axleplatform@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
