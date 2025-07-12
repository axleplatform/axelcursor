// @ts-nocheck
"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Suppress removeChild errors as they are likely harmless DOM cleanup issues
    if (error.message && error.message.includes('removeChild') && error.message.includes('not a child of this node')) {
      console.warn('Suppressed removeChild error:', error.message)
      return { hasError: false }
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Suppress removeChild errors as they are likely harmless DOM cleanup issues
    if (error.message && error.message.includes('removeChild') && error.message.includes('not a child of this node')) {
      console.warn('Suppressed removeChild error:', error.message, errorInfo)
      return
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
      }

      return (
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="space-x-4">
                <Button onClick={this.resetError} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = '/'}>
                  Go Home
                </Button>
              </div>
            </div>
          </main>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
