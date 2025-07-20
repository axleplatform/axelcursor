'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Footer from '@/components/footer';

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
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <Image src="/images/axle-logo-green.png" alt="Axle" width={120} height={48} priority />
          </div>

          {/* Welcome Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Welcome to Axle
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your car's health matters. Choose how you'd like to get started with Axle.
            </p>
          </div>

          {/* Split Screen Container */}
          <div className={`flex ${isMobile ? 'flex-col gap-8' : 'flex-row gap-8'}`}>
            
            {/* Left/Top Section - Book Appointment */}
            <Card className="flex-1 p-8 hover:shadow-lg transition-shadow">
              <div className="text-center">
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🔧</span>
                  </div>
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Need Service Now?
                </h2>
                
                <p className="text-gray-600 mb-6">
                  Get immediate help from our mobile mechanics
                </p>
                
                <Link href="/">
                  <Button 
                    size="lg" 
                    className="w-full bg-[#294a46] hover:bg-[#1a2f2c] text-white font-semibold"
                  >
                    Book an Appointment
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Divider */}
            {!isMobile && (
              <div className="flex items-center justify-center">
                <div className="w-px h-32 bg-gray-300 relative">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-full border border-gray-300">
                    <span className="text-gray-500 font-medium text-sm">OR</span>
                  </div>
                </div>
              </div>
            )}
            
            {isMobile && (
              <div className="flex items-center justify-center">
                <div className="h-px w-full bg-gray-300 relative">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-full border border-gray-300">
                    <span className="text-gray-500 font-medium text-sm">OR</span>
                  </div>
                </div>
              </div>
            )}

            {/* Right/Bottom Section - Get Started */}
            <Card className="flex-1 p-8 hover:shadow-lg transition-shadow">
              <div className="text-center">
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🚗</span>
                  </div>
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Track Your Car Health
                </h2>
                
                <p className="text-gray-600 mb-6">
                  Optimize your vehicle with Axle AI
                </p>
                
                <Link href="/signup">
                  <Button 
                    size="lg" 
                    className="w-full bg-[#294a46] hover:bg-[#1a2f2c] text-white font-semibold"
                  >
                    Get Started with Axle AI
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Sign In Link */}
          <div className="text-center mt-12">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-[#294a46] font-medium hover:text-[#1a2f2c] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
