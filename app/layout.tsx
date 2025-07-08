import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from "@/components/error-boundary"

// Override React.createElement temporarily to catch the error
if (typeof window !== 'undefined') {
  const originalCreateElement = React.createElement;
  React.createElement = function(...args) {
    try {
      return originalCreateElement.apply(React, args);
    } catch (error) {
      if (error.message?.includes('Unexpected token')) {
        console.error('JSX Parse Error in:', args);
        return null;
      }
      throw error;
    }
  };
}

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Axle - Mobile Mechanic Service",
  description: "Connect with trusted mobile mechanics in your area",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
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
      </body>
    </html>
  )
}
