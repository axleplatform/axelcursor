'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Logo Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="max-w-7xl mx-auto flex justify-center">
          <img src="/images/axle-logo-green.png" alt="Axle" className="h-12" />
        </div>
      </div>

      {/* Split Screen Container */}
      <div className={`min-h-screen flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
        
        {/* Left/Top Section - Book Appointment */}
        <div className="flex-1 flex items-center justify-center p-8 relative bg-white/50">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Need Service Now?
            </h2>
            
            <Link href="/">
              <button className="w-full max-w-sm bg-blue-600 text-white py-4 px-8 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg shadow-lg">
                Book an Appointment
              </button>
            </Link>
            
            <p className="mt-4 text-gray-600 font-medium">
              Order a mobile mechanic
            </p>
          </div>
        </div>

        {/* Divider */}
        {!isMobile && (
          <div className="w-px bg-gray-300 relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-100 px-4 py-2 rounded-full">
              <span className="text-gray-500 font-medium">OR</span>
            </div>
          </div>
        )}
        
        {isMobile && (
          <div className="h-px bg-gray-300 relative my-8">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-100 px-4 py-2 rounded-full">
              <span className="text-gray-500 font-medium">OR</span>
            </div>
          </div>
        )}

        {/* Right/Bottom Section - Get Started */}
        <div className="flex-1 flex items-center justify-center p-8 relative bg-gradient-to-br from-green-50 to-blue-50">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Track Your Car Health
            </h2>
            
            <Link href="/signup">
              <button className="w-full max-w-sm bg-green-600 text-white py-4 px-8 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg shadow-lg">
                Get Started with Axle AI
              </button>
            </Link>
            
            <p className="mt-4 text-gray-600 font-medium">
              Optimize your car health
            </p>
          </div>
        </div>
      </div>

      {/* Sign In Link - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center bg-white/80 backdrop-blur-sm">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
} 