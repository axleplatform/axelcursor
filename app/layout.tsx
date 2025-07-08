import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from "@/components/error-boundary"

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

// Global fix - intercept all text rendering
if (typeof window !== 'undefined') {
  const originalCreateElement = React.createElement;
  
  React.createElement = function(type: any, props: any, ...children: any[]) {
    // Intercept text nodes
    const processedChildren = children.map(child => {
      if (typeof child === 'string') {
        // Escape ALL special characters in strings
        return child
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
      return child;
    });
    
    try {
      return originalCreateElement.call(React, type, props, ...processedChildren);
    } catch (error) {
      if (error instanceof Error && error.message?.includes('Unexpected token')) {
        console.error('JSX Parse Error in:', { type, props, children: processedChildren });
        return null;
      }
      throw error;
    }
  };
}

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: universalSafeText("Axle - Mobile Mechanic Service"),
  description: universalSafeText("Connect with trusted mobile mechanics in your area"),
  generator: universalSafeText('v0.dev')
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
