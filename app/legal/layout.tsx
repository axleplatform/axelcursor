import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-16 pb-16">
        <div className="container mx-auto px-4">{children}</div>
      </main>
      <Footer />
    </>
  )
}
