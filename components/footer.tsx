"use client"

import Link from "next/link"
import Image from "next/image"

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 py-6">
      <div className="container mx-auto px-4 text-center text-gray-600">
        <div className="flex items-center justify-center mb-4">
          <Link href="/" className="flex items-center">
            <div className="relative h-7 flex items-center">
              <Image
                src="/images/axle-logo-green.png"
                alt="Axle"
                width={80}
                height={32}
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>
        <p className="text-sm">&copy; {new Date().getFullYear()} axle. All rights reserved.</p>
        <div className="mt-2 text-xs">
          <Link href="/legal/terms" className="hover:underline mr-2">
            Terms of Service
          </Link>
          <Link href="/legal/privacy" className="hover:underline mr-2">
            Privacy Policy
          </Link>
          <Link href="/legal/cookies" className="hover:underline">
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
