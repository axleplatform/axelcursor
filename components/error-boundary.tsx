"use client"

import React, { Component, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
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
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced logging to find the exact component
    console.error('=== JSX PARSING ERROR DETAILS ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error constructor:', error.constructor.name);
    
    // Parse component stack to find the specific component
    const componentStack = errorInfo.componentStack.split('\n');
    const relevantComponents = componentStack
      .filter((line: string) => line.includes('at '))
      .slice(0, 10)
      .map((line: string) => line.trim());
      
    console.error('Component hierarchy:');
    relevantComponents.forEach((comp: string, index: number) => {
      console.error(`  ${index + 1}. ${comp}`);
    });
    
    // Additional context
    console.error('URL:', window.location.pathname);
    console.error('Full URL:', window.location.href);
    console.error('User Agent:', navigator.userAgent);
    console.error('Time:', new Date().toISOString());
    
    // Check if it's a JSX parsing error specifically
    if (error.message.includes('JSX') || error.message.includes('Unexpected token')) {
      console.error('🔍 LIKELY JSX PARSING ERROR DETECTED');
      console.error('This appears to be caused by unescaped dynamic content');
      console.error('Check the component hierarchy above for the source');
    }
    
    console.error('=================================');
    
    this.setState({ hasError: true, error, errorInfo });
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
