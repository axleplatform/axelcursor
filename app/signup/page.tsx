"use client"

import Link from "next/link"
import Image from "next/image"
import { Check } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex justify-center mb-8">
          <Image
            src="/images/axle-logo-green.png"
            alt="Axle"
            width={150}
            height={60}
            priority
            className="object-contain"
          />
        </div>

        <h1 className="text-3xl font-bold text-center text-[#294a46] mb-8">Sign Up</h1>
        <p className="text-center text-gray-600 mb-12">Choose your account type to get started</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Car Owner Option */}
          <Link
            href="/onboarding/customer/flow"
            className="flex flex-col items-center p-8 border-2 border-gray-200 rounded-xl hover:border-[#294a46] hover:shadow-md transition-all duration-200"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "#F9F9F9" }}
            >
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-[#294a46] inline-flex items-center justify-center">🚗</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Car Owner</h2>

            <div className="w-full space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                  <Check className="h-4 w-4 text-[#294a46]" />
                </div>
                <span className="text-gray-700">Find trusted mechanics</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                  <Check className="h-4 w-4 text-[#294a46]" />
                </div>
                <span className="text-gray-700">Schedule repairs</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                  <Check className="h-4 w-4 text-[#294a46]" />
                </div>
                <span className="text-gray-700">Track Service Reports</span>
              </div>
            </div>
          </Link>

          {/* Mechanic Option */}
          <Link
            href="/onboarding/mechanic/signup"
            className="flex flex-col items-center p-8 border-2 border-gray-200 rounded-xl hover:border-[#294a46] hover:shadow-md transition-all duration-200"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "#F9F9F9" }}
            >
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-[#294a46] inline-flex items-center justify-center">🔧</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Mobile Mechanic</h2>

            <div className="w-full space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                  <Check className="h-4 w-4 text-[#294a46]" />
                </div>
                <span className="text-gray-700">Get job requests</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                  <Check className="h-4 w-4 text-[#294a46]" />
                </div>
                <span className="text-gray-700">Track Logistics</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                  <Check className="h-4 w-4 text-[#294a46]" />
                </div>
                <span className="text-gray-700">Grow your business</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#294a46] font-medium hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
