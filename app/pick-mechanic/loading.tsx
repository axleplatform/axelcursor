import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mechanic quotes...</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
