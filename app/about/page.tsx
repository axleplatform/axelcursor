"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import Image from "next/image"

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="bg-[#294a46] text-white pt-12 pb-8 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Image src="/images/axle-logo-white.png" alt="axle" width={180} height={72} className="mx-auto" />
          </div>

          <div className="mb-4 relative">
            <div className="h-px bg-white/50 w-full absolute top-1/2 -z-10"></div>
            <h2 className="text-xl font-medium bg-[#294a46] px-4 inline-block">
              AUTO SERVICE MARKETPLACE PLATFORM FOR MOBILE REPAIRS
            </h2>
          </div>

          <p className="text-white/80 italic mb-6">Honest, mobile car repair services—right at your fingertips.</p>

          <Link href="/">
            <Button className="rounded-full bg-white text-[#294a46] hover:bg-white/90 px-8 py-2 font-medium">
              Book an Appointment
            </Button>
          </Link>

          <div className="mt-8 flex flex-col items-center">
            <p className="text-sm mb-1">LEARN MORE</p>
            <ChevronRight className="animate-bounce" />
          </div>
        </div>
      </section>

      {/* Skip the Shop Section */}
      <section className="py-20 px-4 min-h-[40vh] flex items-center justify-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-[#294a46] text-3xl font-bold text-center mb-6">
            SKIP THE SHOP. GET YOUR CAR FIXED ANYWHERE.
          </h2>

          <p className="text-center text-gray-600 max-w-2xl">No more waiting times. No more calling for quotes.</p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-10">
            <div className="mx-4 text-center">
              <div className="mb-1">
                <div className="relative w-[120px] h-[50px] mx-auto">
                  <Image src="/images/axle-logo-green.png" alt="axle" fill className="mx-auto object-contain" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#294a46]">HOW IT WORKS</h3>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="relative mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#294a46] flex items-center justify-center text-white text-2xl font-bold">
                  1
                </div>
                <div className="absolute top-1/2 left-[calc(50%+32px)] h-px bg-[#294a46] w-[calc(100%-32px)] hidden md:block"></div>
              </div>
              <h4 className="text-[#294a46] font-bold mb-3">
                TELL US
                <br />
                WHAT YOU NEED.
              </h4>
              <p className="text-sm text-gray-600">
                Tell us about your car and what's wrong. Our smart system helps find the issue.
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#294a46] flex items-center justify-center text-white text-2xl font-bold">
                  2
                </div>
                <div className="absolute top-1/2 left-[calc(50%+32px)] h-px bg-[#294a46] w-[calc(100%-32px)] hidden md:block"></div>
              </div>
              <h4 className="text-[#294a46] font-bold mb-3">
                COMPARE & BOOK
                <br />A MOBILE MECHANIC.
              </h4>
              <p className="text-sm text-gray-600">
                Browse available mechanics, compare prices and reviews, and choose the right one for you—all in minutes.
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#294a46] flex items-center justify-center text-white text-2xl font-bold">
                  3
                </div>
              </div>
              <h4 className="text-[#294a46] font-bold mb-3">
                RELAX WHILE
                <br />
                WE HANDLE THE REST.
              </h4>
              <p className="text-sm text-gray-600">
                Your chosen mechanic comes directly to you. No waiting rooms, no hassle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mobile Mechanic Partners Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-10">
            <div className="mx-4 text-center">
              <h3 className="text-xl font-bold text-[#294a46]">ABOUT THE MOBILE MECHANIC BUSINESSES</h3>
              <p className="text-gray-600 mt-2">Trusted professionals at your service</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h4 className="text-[#294a46] font-bold text-lg mb-3">Established Businesses</h4>
              <p className="text-gray-600 mb-4">
                We partner exclusively with established mobile mechanic businesses that maintain a rating no lower than
                4 stars on either Yelp or Google. Many of our partners have been serving their communities for over 10
                years.
              </p>
              <div className="mt-6 p-3 bg-gray-50 rounded-md border border-gray-100 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex mr-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-6 h-6 ${i < 4 ? "text-yellow-500" : "text-gray-300"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-.181h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    ))}
                  </div>
                  <span className="font-medium text-[#294a46]">4.0+</span>
                </div>
                <span className="text-sm text-gray-600">Minimum rating requirement</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h4 className="text-[#294a46] font-bold text-lg mb-3">Thorough Onboarding Process</h4>
              <p className="text-gray-600 mb-4">
                Every mechanic on our platform undergoes a comprehensive vetting process that includes:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-[#294a46] mr-2 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Initial screening calls to verify experience and expertise
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-[#294a46] mr-2 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Verification of licenses, insurance, and business credentials
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-[#294a46] mr-2 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Collection of personal information for quality assurance
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-600">
              Our rigorous selection process ensures that you receive service from only the most qualified and reliable
              mobile mechanics in your area.
            </p>
            <Link href="/onboarding/mechanic" className="mt-4 inline-block">
              <Button variant="outline" className="border-[#294a46] text-[#294a46] hover:bg-[#294a46] hover:text-white">
                Become a Partner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Logo Section - Logo on green background */}
      <section className="bg-[#294a46] h-40 flex items-center justify-center">
        <div className="flex items-center justify-center -mt-4">
          <Image
            src="/images/axle-logo-white.png"
            alt="axle"
            width={200}
            height={40}
            className="object-contain"
            priority
          />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
