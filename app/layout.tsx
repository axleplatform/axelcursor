// @ts-nocheck
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from "@/components/theme-provider"
import ErrorBoundary from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Axle - Mobile Mechanic Service",
  description: "Professional mobile mechanic service at your location",
}

// Global error handler to suppress DOM errors
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    const message = args.join(' ');
    // Only suppress specific DOM cleanup errors, not all errors
    if (
      (message.includes('removeChild') && message.includes('not a child of this node')) ||
      (message.includes('NotFoundError') && message.includes('removeChild')) ||
      (message.includes('Failed to execute') && message.includes('removeChild')) ||
      (message.includes('Node was not found'))
    ) {
      // Completely suppress these specific DOM errors
      return;
    }
    // Call original error for all other errors
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    // Only suppress specific DOM cleanup warnings
    if (
      (message.includes('removeChild') && message.includes('not a child of this node')) ||
      (message.includes('NotFoundError') && message.includes('removeChild')) ||
      (message.includes('Failed to execute') && message.includes('removeChild')) ||
      (message.includes('Node was not found'))
    ) {
      // Completely suppress these specific DOM warnings
      return;
    }
    // Call original warn for all other warnings
    originalWarn.apply(console, args);
  };
  
  // Also catch unhandled errors
  window.addEventListener('error', (event) => {
    if (
      (event.message.includes('removeChild') && event.message.includes('not a child of this node')) ||
      (event.message.includes('NotFoundError') && event.message.includes('removeChild')) ||
      (event.message.includes('Failed to execute') && event.message.includes('removeChild')) ||
      (event.message.includes('Node was not found'))
    ) {
      event.preventDefault();
      return false;
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || '';
    if (
      (message.includes('removeChild') && message.includes('not a child of this node')) ||
      (message.includes('NotFoundError') && message.includes('removeChild')) ||
      (message.includes('Failed to execute') && message.includes('removeChild')) ||
      (message.includes('Node was not found'))
    ) {
      event.preventDefault();
      return false;
    }
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
        </ThemeProvider>
      </body>
    </html>
  )
}
