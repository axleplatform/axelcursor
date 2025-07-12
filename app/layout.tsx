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
  
  // Override the native removeChild method to prevent errors
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    try {
      // Check if the child is actually a child of this node
      if (child && child.parentNode === this) {
        return originalRemoveChild.call(this, child);
      } else {
        // Silently ignore if child is not a child of this node
        return child;
      }
    } catch (error) {
      // Silently ignore any removeChild errors
      return child;
    }
  };
  
  // Also override removeChild on Element prototype
  if (Element.prototype.removeChild !== Node.prototype.removeChild) {
    const originalElementRemoveChild = Element.prototype.removeChild;
    Element.prototype.removeChild = function(child) {
      try {
        if (child && child.parentNode === this) {
          return originalElementRemoveChild.call(this, child);
        } else {
          return child;
        }
      } catch (error) {
        return child;
      }
    };
  }

  // Override appendChild to prevent Google Maps from creating problematic structures
  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    try {
      // If this is a Google Maps related element, be more careful
      if (child && typeof child.className === 'string' && child.className.includes('pac-')) {
        // Check if we already have a similar element
        const existing = this.querySelector(`.${child.className.split(' ')[0]}`);
        if (existing) {
          // Remove existing before adding new
          try {
            this.removeChild(existing);
          } catch (error) {
            // Ignore removal errors
          }
        }
      }
      return originalAppendChild.call(this, child);
    } catch (error) {
      // If appendChild fails, try to clean up and retry
      try {
        // Clean up any Google Maps elements
        const pacElements = this.querySelectorAll('.pac-container, .pac-item');
        pacElements.forEach(el => {
          try {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        });
        return originalAppendChild.call(this, child);
      } catch (retryError) {
        // If all else fails, return the child without appending
        return child;
      }
    }
  };

  // Override insertBefore for similar protection
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    try {
      // If this is a Google Maps related element, be more careful
      if (newNode && typeof newNode.className === 'string' && newNode.className.includes('pac-')) {
        // Check if we already have a similar element
        const existing = this.querySelector(`.${newNode.className.split(' ')[0]}`);
        if (existing) {
          // Remove existing before inserting new
          try {
            this.removeChild(existing);
          } catch (error) {
            // Ignore removal errors
          }
        }
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    } catch (error) {
      // If insertBefore fails, try to clean up and retry
      try {
        // Clean up any Google Maps elements
        const pacElements = this.querySelectorAll('.pac-container, .pac-item');
        pacElements.forEach(el => {
          try {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        });
        return originalInsertBefore.call(this, newNode, referenceNode);
      } catch (retryError) {
        // If all else fails, return the newNode without inserting
        return newNode;
      }
    }
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    // Suppress all removeChild and DOM manipulation errors
    if (
      message.includes('removeChild') ||
      message.includes('NotFoundError') ||
      message.includes('Failed to execute') ||
      message.includes('Node was not found') ||
      message.includes('not a child of this node') ||
      message.includes('The node to be removed is not a child')
    ) {
      // Completely suppress these DOM errors
      return;
    }
    // Call original error for all other errors
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    // Suppress all removeChild and DOM manipulation warnings
    if (
      message.includes('removeChild') ||
      message.includes('NotFoundError') ||
      message.includes('Failed to execute') ||
      message.includes('Node was not found') ||
      message.includes('not a child of this node') ||
      message.includes('The node to be removed is not a child')
    ) {
      // Completely suppress these DOM warnings
      return;
    }
    // Call original warn for all other warnings
    originalWarn.apply(console, args);
  };
  
  // Also catch unhandled errors
  window.addEventListener('error', (event) => {
    if (
      event.message.includes('removeChild') ||
      event.message.includes('NotFoundError') ||
      event.message.includes('Failed to execute') ||
      event.message.includes('Node was not found') ||
      event.message.includes('not a child of this node') ||
      event.message.includes('The node to be removed is not a child')
    ) {
      event.preventDefault();
      return false;
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || '';
    if (
      message.includes('removeChild') ||
      message.includes('NotFoundError') ||
      message.includes('Failed to execute') ||
      message.includes('Node was not found') ||
      message.includes('not a child of this node') ||
      message.includes('The node to be removed is not a child')
    ) {
      event.preventDefault();
      return false;
    }
  });

  // More aggressive Google Maps cleanup
  let cleanupTimeout: NodeJS.Timeout | null = null;
  
  const aggressiveCleanup = () => {
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout);
    }
    
    cleanupTimeout = setTimeout(() => {
      try {
        // Remove all Google Maps related DOM elements
        const selectors = [
          '.pac-container',
          '[data-google-maps-autocomplete]',
          '.pac-item',
          '.pac-matched',
          '.pac-logo',
          '.pac-query',
          '.pac-item-query',
          '.pac-item-text'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            try {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
              }
            } catch (error) {
              // Ignore cleanup errors
            }
          });
        });
        
        // Also try to import and call global cleanup
        import('@/lib/google-maps').then(({ globalCleanup }) => {
          globalCleanup();
        }).catch(() => {
          // Ignore import errors
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }, 50);
  };

  // Cleanup on all possible events
  window.addEventListener('popstate', aggressiveCleanup);
  window.addEventListener('beforeunload', aggressiveCleanup);
  window.addEventListener('unload', aggressiveCleanup);
  
  // Cleanup on visibility change (for SPA navigation)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      aggressiveCleanup();
    }
  });
  
  // Periodic cleanup to catch any lingering elements
  setInterval(aggressiveCleanup, 5000);
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
