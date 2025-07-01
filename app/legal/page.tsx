import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function LegalHubPage() {
  return (
    <div className="py-8">
      <div className="container">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Legal Information</h1>
        <p className="text-gray-600 mb-8 max-w-3xl">
          This page contains all legal documents related to the use of Axle platform. Please review these documents
          carefully to understand your rights and responsibilities when using our services.
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <Link
            href="/legal/privacy"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Privacy Policy</h2>
              <ChevronRight className="h-5 w-5 text-[#294a46] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-gray-600">
              Learn how we collect, use, and protect your personal information when you use our platform.
            </p>
            <p className="text-sm text-gray-500 mt-4">Last updated: March 28th, 2025</p>
          </Link>

          <Link
            href="/legal/cookies"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Cookie Policy</h2>
              <ChevronRight className="h-5 w-5 text-[#294a46] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-gray-600">
              Understand how we use cookies and similar technologies on our website and mobile applications.
            </p>
            <p className="text-sm text-gray-500 mt-4">Last updated: March 28th, 2025</p>
          </Link>

          <Link
            href="/legal/terms"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Terms of Service</h2>
              <ChevronRight className="h-5 w-5 text-[#294a46] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-gray-600">The terms and conditions governing your use of the Axle platform.</p>
            <p className="text-sm text-gray-500 mt-4">Last updated: March 28th, 2025</p>
          </Link>

          <Link
            href="#"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group opacity-50 pointer-events-none"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Mechanic Agreement</h2>
              <ChevronRight className="h-5 w-5 text-[#294a46] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-gray-600">Terms specific to mechanics providing services through the Axle platform.</p>
            <p className="text-sm text-gray-500 mt-4">Coming soon</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
