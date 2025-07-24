import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from 'next/script'
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from "@/components/theme-provider"
import ErrorBoundary from "@/components/error-boundary"
import { useEffect } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Axle - Mobile Mechanic Service",
  description: "Professional mobile mechanic service at your location",
    generator: 'v0.dev'
}



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        if (cookie.includes('base64-')) {
          const name = cookie.split('=')[0].trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
  }, []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Load DOM fixes before anything else */}
        <Script src="/dom-fixes.js" strategy="beforeInteractive" />
        {/* Scroll to top on navigation */}
        <Script src="/scroll-to-top.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
