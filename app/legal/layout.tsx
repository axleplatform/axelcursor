import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"

// Server and client safe text escaping
function universalSafeText(content: any): string {
  if (!content) return '';
  const str = typeof content === 'string' ? content : String(content);
  
  // Escape all problematic characters
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;')
    .replace(/\//g, '&#47;')  // Also escape forward slash
    .replace(/\\/g, '&#92;');  // And backslash
}

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
