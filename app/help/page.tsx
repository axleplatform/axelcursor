import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import HelpSearchForm from "@/components/help-search-form"
import { HelpCircle,  ChevronRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Help & Support | Axle",
  description: "Get help with your Axle account, bookings, and mechanic services.",
}

export default function HelpPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-[#294a46] text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-lg max-w-2xl mx-auto mb-8">
              Find answers to common questions and learn how to get the most out of Axle.
            </p>
            <HelpSearchForm />
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-[#F9F9F9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="h-8 w-8 text-[#294a46]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">FAQs</h3>
                <p className="text-gray-600 mb-4">Find answers to the most commonly asked questions.</p>
                <a href="#faqs" className="text-[#294a46] font-medium hover:underline">
                  View FAQs
                </a>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-[#F9F9F9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="h-8 w-8 text-[#294a46]">⚙️</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Troubleshooting</h3>
                <p className="text-gray-600 mb-4">Solutions to common issues you might encounter.</p>
                <a href="#troubleshooting" className="text-[#294a46] font-medium hover:underline">
                  Get Help
                </a>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-[#F9F9F9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="h-8 w-8 text-[#294a46]">📧</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Contact Support</h3>
                <p className="text-gray-600 mb-4">Get in touch with our customer support team.</p>
                <a href="#contact" className="text-[#294a46] font-medium hover:underline">
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section id="faqs" className="py-12 bg-[#F9F9F9]">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>

            <div className="max-w-3xl mx-auto space-y-4">
              {/* FAQ Item 1 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">How do I book a mechanic?</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p>Booking a mechanic on Axle is simple:</p>
                  <ol className="list-decimal pl-5 mt-2 space-y-2">
                    <li>Create an account or log in to your existing account</li>
                    <li>Enter your vehicle details and the service you need</li>
                    <li>Select your preferred date and time</li>
                    <li>Choose from available mechanics in your area</li>
                    <li>Confirm your booking and payment details</li>
                  </ol>
                  <p className="mt-2">
                    Once confirmed, you'll receive a confirmation email with all the details of your appointment.
                  </p>
                </div>
              </details>

              {/* FAQ Item 2 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">How do payments work?</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p>Axle uses a secure payment system to handle all transactions:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>You'll be charged only after you confirm your booking</li>
                    <li>We accept all major credit and debit cards</li>
                    <li>Your payment information is encrypted and securely stored</li>
                    <li>You'll receive an invoice via email after the service is completed</li>
                  </ul>
                  <p className="mt-2">
                    If you need to cancel, our refund policy applies based on how much notice you provide.
                  </p>
                </div>
              </details>

              {/* FAQ Item 3 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">What if I need to reschedule or cancel?</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p>You can reschedule or cancel your appointment through your account dashboard:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>Log in to your account and go to "My Appointments"</li>
                    <li>Select the appointment you wish to modify</li>
                    <li>Choose "Reschedule" or "Cancel" and follow the prompts</li>
                  </ul>
                  <p className="mt-2">Our cancellation policy:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>Cancellations more than 24 hours before the appointment: Full refund</li>
                    <li>Cancellations within 24 hours: 50% refund</li>
                    <li>No-shows: No refund</li>
                  </ul>
                </div>
              </details>

              {/* FAQ Item 4 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">Are your mechanics certified?</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p>Yes, all mechanics on the Axle platform are thoroughly vetted:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>We verify professional certifications and qualifications</li>
                    <li>Background checks are conducted for all mechanics</li>
                    <li>We require proof of insurance and relevant licenses</li>
                    <li>Customer reviews help maintain high service standards</li>
                  </ul>
                  <p className="mt-2">
                    You can view each mechanic's qualifications and customer ratings before booking.
                  </p>
                </div>
              </details>

              {/* FAQ Item 5 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">What services do you offer?</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p>Axle offers a wide range of automotive services, including:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>Oil changes and routine maintenance</li>
                    <li>Brake repairs and replacements</li>
                    <li>Battery replacements</li>
                    <li>Tire rotations and replacements</li>
                    <li>Engine diagnostics and repairs</li>
                    <li>Electrical system repairs</li>
                    <li>Air conditioning and heating services</li>
                    <li>Pre-purchase inspections</li>
                  </ul>
                  <p className="mt-2">
                    If you need a service not listed here, you can describe your needs when booking, and we'll match you
                    with a mechanic who can help.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section id="troubleshooting" className="py-12 bg-[#F9F9F9]">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Troubleshooting Guide</h2>

            <div className="max-w-3xl mx-auto space-y-4">
              {/* Troubleshooting Item 1 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">I can't log in to my account</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p className="mb-3">If you're having trouble logging in, try these steps:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Check that you're using the correct email address</li>
                    <li>Reset your password using the "Forgot Password" link</li>
                    <li>Clear your browser cache and cookies</li>
                    <li>Try using a different browser or device</li>
                  </ol>
                  <p className="mt-3">If you still can't log in, contact our support team for assistance.</p>
                </div>
              </details>

              {/* Troubleshooting Item 2 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">My appointment doesn't appear in my dashboard</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p className="mb-3">If your appointment is missing from your dashboard:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Check your email for a booking confirmation</li>
                    <li>Refresh the page or log out and log back in</li>
                    <li>Check if the appointment was accidentally canceled</li>
                    <li>Verify that the payment was processed successfully</li>
                  </ol>
                  <p className="mt-3">
                    If you have a confirmation email but don't see the appointment in your dashboard, please contact
                    support with your booking reference number.
                  </p>
                </div>
              </details>

              {/* Troubleshooting Item 3 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">Payment issues or declined transactions</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p className="mb-3">If you're experiencing payment issues:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Verify that your card details are entered correctly</li>
                    <li>Check that your card hasn't expired</li>
                    <li>Ensure you have sufficient funds available</li>
                    <li>Contact your bank to see if they're blocking the transaction</li>
                    <li>Try using a different payment method</li>
                  </ol>
                  <p className="mt-3">
                    For persistent payment issues, please contact our support team with details of the error message you
                    received.
                  </p>
                </div>
              </details>

              {/* Troubleshooting Item 4 */}
              <details className="bg-white p-6 rounded-lg shadow-sm group">
                <summary className="list-none flex justify-between items-center cursor-pointer">
                  <h3 className="text-lg font-medium">The mechanic didn't arrive at the scheduled time</h3>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="h-6 w-6 text-[#294a46]" />
                  </span>
                </summary>
                <div className="mt-4 text-gray-600">
                  <p className="mb-3">If your mechanic is late or didn't arrive:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Check your appointment details to confirm the date and time</li>
                    <li>Check for any messages from the mechanic in your app notifications</li>
                    <li>Wait 15 minutes, as mechanics may sometimes run slightly behind schedule</li>
                    <li>Use the "Contact Mechanic" feature in your appointment details</li>
                    <li>If you can't reach the mechanic, contact our support team immediately</li>
                  </ol>
                  <p className="mt-3">
                    We take reliability seriously and will help resolve the situation as quickly as possible.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* Contact Support Section */}
        <section id="contact" className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Contact Support</h2>

            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-[#F9F9F9] rounded-full flex items-center justify-center mb-6">
                    <Mail className="h-10 w-10 text-[#294a46]" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Email Support</h3>
                  <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                    Our support team is available to help you with any questions or issues you may have.
                  </p>
                  <a
                    href="mailto:axleplatform@gmail.com"
                    className="text-xl font-medium text-[#294a46] hover:underline"
                  >
                    axleplatform@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
