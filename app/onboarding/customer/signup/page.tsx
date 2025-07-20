"use client"

import { CustomerSignupForm } from "@/components/customer-signup-form"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"

// Page components CANNOT have props!
export default function CustomerSignupPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <CustomerSignupForm />
      <Footer />
    </div>
  )
}
