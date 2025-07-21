"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GoogleSignInButton } from '@/components/google-signin-button'
import { CustomerSignupForm } from '@/components/customer-signup-form'
import { SiteHeader } from '@/components/site-header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'

// Type definitions
type Vehicle = {
  year: string;
  make: string;
  model: string;
  vin?: string;
  mileage?: string;
  licensePlate?: string;
};

type OnboardingData = {
  vehicle: Vehicle;
  referralSource: string;
  usedOtherApps: boolean | null;
  lastService: {
    date: string;
    type: string;
    mileage: string;
  };
  location: string | null;
  notifications: boolean;
  additionalVehicles: Vehicle[];
  userId: string | null;
  phoneNumber: string;
  plan: string | null;
  freeTrial: boolean;
};

type StepProps = {
  onNext: () => void;
  updateData: (data: Partial<OnboardingData>) => void;
  onboardingData?: OnboardingData;
  setSkippedSteps?: React.Dispatch<React.SetStateAction<number[]>>;
};

// Step Components
const VehicleInfoStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [vehicle, setVehicle] = useState<Vehicle>({ 
    year: '', 
    make: '', 
    model: '', 
    vin: '', 
    mileage: '', 
    licensePlate: '' 
  })

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Input Car Information</h2>
        <p className="text-gray-600 text-sm">
          Tell us about your car so we can provide accurate service recommendations
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Row 1: Year, Make, Model */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input 
              type="number" 
              placeholder="2020" 
              value={vehicle.year} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle({...vehicle, year: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
            <input 
              type="text" 
              placeholder="Toyota" 
              value={vehicle.make} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle({...vehicle, make: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <input 
              type="text" 
              placeholder="Camry" 
              value={vehicle.model} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle({...vehicle, model: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
          </div>
        </div>

        {/* Row 2: Mileage, License Plate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mileage</label>
            <input 
              type="number" 
              placeholder="50,000" 
              value={vehicle.mileage} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle({...vehicle, mileage: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">License Plate</label>
            <input 
              type="text" 
              placeholder="ABC123" 
              value={vehicle.licensePlate} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle({...vehicle, licensePlate: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
          </div>
        </div>

        {/* Row 3: VIN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">VIN (Optional)</label>
          <input 
            type="text" 
            placeholder="1HGBH41JXMN109186" 
            value={vehicle.vin} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle({...vehicle, vin: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
          />
        </div>
      </div>

      {/* Button matching book appointment */}
      <button 
        onClick={() => {
          updateData({ vehicle })
          onNext()
        }}
        className="mt-6 w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
      >
        Continue
      </button>
    </div>
  )
}

const ReferralSourceStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  
  const sources = [
    { 
      name: 'Google Search', 
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )
    },
    { 
      name: 'App Store', 
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 256 256">
          <defs>
            <linearGradient id="appStoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00C6FF"/>
              <stop offset="100%" stopColor="#0072FF"/>
            </linearGradient>
          </defs>
          <rect width="256" height="256" rx="60" fill="url(#appStoreGradient)"/>
          <path fill="white" d="M130.7 166.5l20.8-36c1.5-2.6 4.8-3.5 7.4-2s3.5 4.8 2 7.4c-.1.2-.2.3-.3.5l-16.3 28.2h44.5c3 0 5.4 2.4 5.4 5.4s-2.4 5.4-5.4 5.4h-57c-.5 0-1-.1-1.5-.2-.2 0-.3-.1-.5-.1-2.4-.8-3.8-3.2-3.5-5.7.1-1.1.5-2.1 1.2-2.9h.2zm-35.6-57.7c.4 0 .9.1 1.3.2 2.7.8 4.3 3.6 3.5 6.3-.2.6-.5 1.2-.9 1.7L53.8 195h26.6l11.3-19.5c1.5-2.6 4.8-3.5 7.4-2s3.5 4.8 2 7.4l-.3.5-6.8 11.7c-.5.8-.7 1.8-.7 2.7 0 3 2.4 5.4 5.4 5.4s5.4-2.4 5.4-5.4v-.2l49.7-86c1.5-2.6 4.8-3.5 7.4-2s3.5 4.8 2 7.4l-.3.5-29 50.2c-.8 1.3-.8 2.9-.2 4.3h14l26.2-45.4c1.5-2.6 4.8-3.5 7.4-2 2.6 1.5 3.5 4.8 2 7.4-.1.2-.2.3-.3.5l-30.6 53c-.8 1.4-2.3 2.3-3.9 2.3H41.8c-3.8 0-6.5-3.8-5.2-7.4l50.6-87.5c.8-1.4 2.3-2.2 3.9-2.2zm42.8-32.4c2.6-1.5 5.9-.6 7.4 2s.6 5.9-2 7.4l-.5.3-18 10.4c-2.6 1.5-5.9.6-7.4-2s-.6-5.9 2-7.4c.1-.1.3-.2.4-.3l18.1-10.4z"/>
        </svg>
      )
    },
    { 
      name: 'Friend/Family', 
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#6B7280">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      )
    },
    { 
      name: 'Instagram', 
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <defs>
            <radialGradient id="igGradient" cx="30%" cy="107%">
              <stop offset="0%" stopColor="#FED576"/>
              <stop offset="26%" stopColor="#F47133"/>
              <stop offset="61%" stopColor="#BC3081"/>
              <stop offset="100%" stopColor="#4C63D2"/>
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#igGradient)"/>
          <path fill="white" d="M12 7.8c1.4 0 1.6 0 2.1.1.5 0 .8.1 1 .2.2.1.4.2.6.4.2.2.3.4.4.6.1.2.2.5.2 1 0 .5.1.7.1 2.1s0 1.6-.1 2.1c0 .5-.1.8-.2 1-.1.2-.2.4-.4.6-.2.2-.4.3-.6.4-.2.1-.5.2-1 .2-.5 0-.7.1-2.1.1s-1.6 0-2.1-.1c-.5 0-.8-.1-1-.2-.2-.1-.4-.2-.6-.4-.2-.2-.3-.4-.4-.6-.1-.2-.2-.5-.2-1 0-.5-.1-.7-.1-2.1s0-1.6.1-2.1c0-.5.1-.8.2-1 .1-.2.2-.4.4-.6.2-.2.4-.3.6-.4.2-.1.5-.2 1-.2.5 0 .7-.1 2.1-.1zm0-1c-1.4 0-1.6 0-2.2.1-.6 0-1 .1-1.4.3-.4.1-.7.3-1 .6-.3.3-.5.6-.6 1-.1.4-.2.8-.3 1.4 0 .6-.1.8-.1 2.2s0 1.6.1 2.2c0 .6.1 1 .3 1.4.1.4.3.7.6 1 .3.3.6.5 1 .6.4.1.8.2 1.4.3.6 0 .8.1 2.2.1s1.6 0 2.2-.1c.6 0 1-.1 1.4-.3.4-.1.7-.3 1-.6.3-.3.5-.6.6-1 .1-.4.2-.8.3-1.4 0-.6.1-.8.1-2.2s0-1.6-.1-2.2c0-.6-.1-1-.3-1.4-.1-.4-.3-.7-.6-1-.3-.3-.6-.5-1-.6-.4-.1-.8-.2-1.4-.3-.6 0-.8-.1-2.2-.1z"/>
          <path fill="white" d="M12 9.2c-1.6 0-2.8 1.3-2.8 2.8s1.3 2.8 2.8 2.8 2.8-1.3 2.8-2.8-1.2-2.8-2.8-2.8zm0 4.6c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8z"/>
          <circle fill="white" cx="15" cy="9" r="0.6"/>
        </svg>
      )
    },
    { 
      name: 'TikTok', 
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <rect width="24" height="24" rx="6" fill="#000000"/>
          <path fill="#FF004F" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          <path fill="white" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" opacity="0"/>
        </svg>
      )
    },
    { 
      name: 'YouTube', 
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    { 
      name: 'TV', 
      logo: (
        <svg className="w-6 h-6" fill="#4B5563" viewBox="0 0 24 24">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
        </svg>
      )
    },
    { 
      name: 'Facebook', 
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    { 
      name: 'Other', 
      logo: (
        <svg className="w-6 h-6" fill="#9CA3AF" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )
    }
  ]

  const toggleSource = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const handleContinue = () => {
    updateData({ referralSource: selectedSources.join(', ') })
    onNext()
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Where'd you find us?</h2>
        <p className="text-gray-600 text-sm">
          Help us understand how you found Axle
        </p>
      </div>
      
      <div className="space-y-4 mb-8">
        {sources.map(source => (
          <button
            key={source.name}
            onClick={() => toggleSource(source.name)}
            className={`w-full p-4 text-left border-2 rounded-lg transition-all group flex items-center justify-between ${
              selectedSources.includes(source.name)
                ? 'border-[#294a46] bg-[#e6eeec]'
                : 'border-gray-200 hover:border-[#294a46] hover:bg-[#e6eeec]'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{source.logo}</span>
              <h3 className={`font-medium group-hover:text-[#294a46] ${
                selectedSources.includes(source.name) ? 'text-[#294a46]' : 'text-gray-900'
              }`}>
                {source.name}
              </h3>
            </div>
            {selectedSources.includes(source.name) && (
              <div className="w-5 h-5 bg-[#294a46] rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={handleContinue}
          disabled={selectedSources.length === 0}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const PreviousAppsStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Have you used other car service apps?</h2>
        <p className="text-gray-600 text-sm">
          We'd like to understand your experience with similar services
        </p>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={() => {
            updateData({ usedOtherApps: true })
            onNext()
          }}
          className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-[#294a46] hover:bg-[#e6eeec] transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👍</span>
            <h3 className="font-medium text-gray-900 group-hover:text-[#294a46]">
              Yes, I have
            </h3>
          </div>
        </button>
        
        <button
          onClick={() => {
            updateData({ usedOtherApps: false })
            onNext()
          }}
          className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-[#294a46] hover:bg-[#e6eeec] transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👎</span>
            <h3 className="font-medium text-gray-900 group-hover:text-[#294a46]">
              No, this is my first time
            </h3>
          </div>
        </button>
      </div>
    </div>
  )
}

const WhyAxleStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Axle AI is Better</h2>
        <p className="text-gray-600 text-sm">
          See how Axle AI creates long-term results for car owners
        </p>
      </div>
      
      {/* Visual comparison cards like book appointment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="text-red-600 text-3xl mb-3">📉</div>
          <h3 className="font-semibold text-red-900 mb-2">Without Axle</h3>
          <p className="text-red-700">Higher maintenance costs</p>
          <div className="text-2xl font-bold text-red-600 mt-4">$$$</div>
        </div>
        
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="text-green-600 text-3xl mb-3">📈</div>
          <h3 className="font-semibold text-green-900 mb-2">With Axle</h3>
          <p className="text-green-700">Lower maintenance costs</p>
          <div className="text-2xl font-bold text-green-600 mt-4">$</div>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-[#e6eeec] border-2 border-[#294a46] rounded-lg p-6 mb-8">
        <p className="text-lg font-semibold text-[#294a46]">
          Over 87% of people save money when tracking car health
        </p>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={onNext}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const LastServiceStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [lastService, setLastService] = useState({
    date: '',
    type: '',
    mileage: ''
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Last Service Information</h2>
        <p className="text-gray-600 text-sm">
          This helps us understand your car's maintenance history
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Row 1: Service Date and Mileage at Service */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Date</label>
            <input 
              type="date" 
              value={lastService.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastService({...lastService, date: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mileage at Service</label>
            <input 
              type="number" 
              placeholder="45,000"
              value={lastService.mileage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastService({...lastService, mileage: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Row 2: Service Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
          <input 
            type="text" 
            placeholder="e.g., Oil Change, Brake Service, Tire Rotation"
            value={lastService.type}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastService({...lastService, type: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
          />
        </div>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={() => {
            updateData({ lastService })
            onNext()
          }}
          className="mt-8 w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const ThankYouStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div className="text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600">
          We're excited to help you take better care of your vehicle.
        </p>
      </div>
      
      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={onNext}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const BenefitsStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Axle AI Benefits</h2>
        <p className="text-gray-600 text-sm">
          Discover what makes Axle AI the smart choice for car maintenance
        </p>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg">
          <div className="text-2xl">🎯</div>
          <div>
            <h3 className="font-semibold text-gray-900">Predictive Maintenance</h3>
            <p className="text-gray-600 text-sm">AI predict your next service</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg">
          <div className="text-2xl">💰</div>
          <div>
            <h3 className="font-semibold text-gray-900">Cost Savings</h3>
            <p className="text-gray-600 text-sm">Reduce chance of hefty repairs</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg">
          <div className="text-2xl">🔧</div>
          <div>
            <h3 className="font-semibold text-gray-900">Established Research</h3>
            <p className="text-gray-600 text-sm">AI has your answers right away</p>
          </div>
        </div>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={onNext}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const LocationStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [location, setLocation] = useState('')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Where are you located?</h2>
        <p className="text-gray-600 text-sm">
          Help us find mechanics and services near you
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          City or Zip Code
        </label>
        <input 
          type="text" 
          placeholder="Enter your city or zip code" 
          value={location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent mb-8"
        />
      </div>
      
      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={() => {
            updateData({ location })
            onNext()
          }}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const NotificationsStep = ({ onNext, updateData, onboardingData }: StepProps) => {
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    
    // Set notifications enabled
    updateData({ notifications: true });

    // Request browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('Axle Notifications Enabled! 🎉', {
            body: 'You\'ll receive updates about your vehicle maintenance.',
            icon: '/images/axle-logo-green.png'
          });
        }
      } catch (error) {
        console.log('Notification permission error:', error);
      }
    }

    setRequesting(false);
    onNext();
  };

  const handleDontAllow = () => {
    updateData({ notifications: false });
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      {/* Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-[#294a46] rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </div>

        {/* Title - Apple style */}
  <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
    We Like to Send You Notifications
  </h2>
      
        {/* Description */}
  <p className="text-base text-gray-600 text-center mb-8 max-w-sm">
    Notifications may include predictive maintenance services, order receipts, mechanics quotes and eta, and more!
  </p>

        {/* Buttons - Apple style */}
  <div className="w-full max-w-xs grid grid-cols-2 gap-3">
    {/* Don't Allow Button */}
    <button
      onClick={handleDontAllow}
      className="py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
    >
      Don't Allow
    </button>
    
    {/* Allow Button - Our brand color */}
    <div className="relative">
      <button
        onClick={handleAllow}
        disabled={requesting}
        className="w-full py-3 px-6 bg-[#294a46] text-white rounded-xl font-medium hover:bg-[#1e3632] transition-colors disabled:opacity-50"
      >
        {requesting ? (
          <span className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Allowing...
          </span>
        ) : (
          'Allow'
        )}
      </button>
          
          {/* Pointing Finger Emoji */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <span className="text-2xl">👆</span>
          </div>
        </div>
      </div>

      {/* Small print - optional */}
      <p className="text-xs text-gray-500 text-center mt-12 max-w-xs">
        You can change this anytime in your device settings
      </p>
    </div>
  );
};

const AddVehicleStep = ({ onNext, updateData, onboardingData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Vehicle>({
    year: '',
    make: '',
    model: '',
    vin: '',
    mileage: '',
    licensePlate: ''
  });

  const handleAddVehicle = () => {
    if (newVehicle.year && newVehicle.make && newVehicle.model) {
      // Add the new vehicle to the additionalVehicles array
      const updatedVehicles = [...(onboardingData?.additionalVehicles || []), newVehicle];
      updateData({ additionalVehicles: updatedVehicles });
      
      // Reset form
      setNewVehicle({
        year: '',
        make: '',
        model: '',
        vin: '',
        mileage: '',
        licensePlate: ''
      });
      setShowAddForm(false);
      
      // Show success message
      alert(`Vehicle ${updatedVehicles.length + 1} added successfully!`);
    }
  };

  const totalVehicles = 1 + (onboardingData?.additionalVehicles?.length || 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Another Car</h2>
        <p className="text-gray-600 text-sm">
          Do you have additional cars you'd like to track?
        </p>
      </div>

      {/* Current Vehicles List */}
      <div className="mb-6 space-y-3">
        {/* Primary Vehicle */}
        {!showAddForm && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">Vehicle 1 (Primary)</span>
                <p className="font-medium text-gray-900">
                  {onboardingData?.vehicle?.year} {onboardingData?.vehicle?.make} {onboardingData?.vehicle?.model}
                </p>
              </div>
              <div className="text-[#294a46]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Additional Vehicles */}
        {onboardingData?.additionalVehicles?.map((vehicle, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">Vehicle {index + 2}</span>
                <p className="font-medium text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
              </div>
              <div className="text-[#294a46]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vehicle Form (Hidden by default) */}
      {showAddForm && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Add Vehicle {totalVehicles + 1}
          </h3>
          
          {/* Same form fields as Step 1 */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input 
                  type="number" 
                  placeholder="2020"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make
                </label>
                <input 
                  type="text" 
                  placeholder="Toyota"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input 
                  type="text" 
                  placeholder="Camry"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VIN (Optional)
              </label>
              <input 
                type="text" 
                placeholder="1HGBH41JXMN109186"
                value={newVehicle.vin}
                onChange={(e) => setNewVehicle({...newVehicle, vin: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Mileage
                </label>
                <input 
                  type="number" 
                  placeholder="45000"
                  value={newVehicle.mileage}
                  onChange={(e) => setNewVehicle({...newVehicle, mileage: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder="ABC 1234"
                  value={newVehicle.licensePlate}
                  onChange={(e) => setNewVehicle({...newVehicle, licensePlate: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddVehicle}
              disabled={!newVehicle.year || !newVehicle.make || !newVehicle.model}
              className="flex-1 bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium disabled:bg-gray-300"
            >
              Save Car
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewVehicle({
                  year: '',
                  make: '',
                  model: '',
                  vin: '',
                  mileage: '',
                  licensePlate: ''
                });
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Actions (Only show on desktop or when showButton is true) */}
      {showButton && !showAddForm && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 border-2 border-[#294a46] text-[#294a46] py-3 px-6 rounded-lg hover:bg-[#e6eeec] transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Car
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
};

const MaintenanceStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Maintenance Schedule</h2>
        <p className="text-gray-600 text-sm">
          We'll create a personalized maintenance plan for your vehicle
        </p>
      </div>
      
      <div className="bg-[#e6eeec] border-2 border-[#294a46] rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-[#294a46] mb-4">Your personalized schedule will include:</h3>
        <ul className="text-[#294a46] space-y-2">
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Oil change reminders
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Tire rotation schedule
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Brake inspection dates
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Fluid level checks
          </li>
        </ul>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={onNext}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const SettingUpStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div className="text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Setting Up Your Account</h2>
        <p className="text-gray-600 text-sm">
          We're configuring your personalized experience
        </p>
      </div>
      
      <div className="animate-pulse mb-8">
        <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={onNext}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const PlanReadyStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Plan is Ready!</h2>
        <p className="text-gray-600 text-sm">
          We've created a personalized maintenance plan for your vehicle
        </p>
      </div>
      
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-green-900 mb-4">Based on your vehicle information:</h3>
        <ul className="text-green-800 space-y-2">
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Next oil change: 3,000 miles
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Tire rotation: 6,000 miles
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Brake inspection: 12,000 miles
          </li>
        </ul>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={onNext}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}
    </div>
  )
}

const CreateAccountStep = ({ onNext, updateData, onboardingData, setSkippedSteps, showButton = true }: StepProps & { showButton?: boolean }) => {
  const handleSkip = () => {
    if (setSkippedSteps) {
      setSkippedSteps((prev: number[]) => [...prev, 14])
    }
    onNext()
  }

  return (
    <div>
      <CustomerSignupForm 
        isOnboarding={true}
        onboardingData={onboardingData}
        onSuccess={(userId: string) => {
          updateData({ userId });
          onNext();
        }}
      />
      {/* Skip button */}
      <div className="mt-4 text-center">
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-700 underline text-sm"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

const PhoneNumberStep = ({ onNext, updateData, setSkippedSteps, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [phoneNumber, setPhoneNumber] = useState('')

  const handleSkip = () => {
    if (setSkippedSteps) {
      setSkippedSteps((prev: number[]) => [...prev, 15])
    }
    onNext()
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Phone Number</h2>
        <p className="text-gray-600 text-sm">
          Add your phone number for appointment notifications
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <input 
          type="tel" 
          placeholder="(555) 123-4567" 
          value={phoneNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent mb-8"
        />
      </div>
      
      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={() => {
            updateData({ phoneNumber })
            onNext()
          }}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Continue
        </button>
      )}

      {/* Skip button */}
      <div className="mt-4 text-center">
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-700 underline text-sm"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

const FreeTrialStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Free Trial</h2>
        <p className="text-gray-600 text-sm">
          Try Axle Premium free for 30 days
        </p>
      </div>
      
      <div className="bg-[#e6eeec] border-2 border-[#294a46] rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-[#294a46] mb-4">Free Trial Includes:</h3>
        <ul className="text-[#294a46] space-y-2">
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            Unlimited maintenance tracking
          </li>
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            Priority customer support
          </li>
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            Advanced AI insights
          </li>
          <li className="flex items-center">
            <span className="mr-2">✓</span>
            No credit card required
          </li>
        </ul>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={() => {
            updateData({ freeTrial: true })
            onNext()
          }}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Start Free Trial
        </button>
      )}
    </div>
  )
}

const ChoosePlanStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const plans = [
    { id: 'basic', name: 'Basic', price: 'Free', features: ['Basic tracking', 'Email reminders'] },
    { id: 'premium', name: 'Premium', price: '$9.99/month', features: ['Advanced AI', 'Priority support', 'Unlimited tracking'] }
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600 text-sm">
          Select the plan that best fits your needs
        </p>
      </div>
      
      <div className="space-y-4">
        {plans.map(plan => (
          <button
            key={plan.id}
            onClick={() => {
              updateData({ plan: plan.id })
              onNext()
            }}
            className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-[#294a46] hover:bg-[#e6eeec] transition-all group"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-[#294a46]">{plan.name}</h3>
                <p className="text-gray-600">{plan.price}</p>
              </div>
              <div className="text-right">
                {plan.features.map(feature => (
                  <div key={feature} className="text-sm text-gray-600">• {feature}</div>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

const LimitedOfferStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div className="text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Limited Time Offer</h2>
        <p className="text-gray-600 text-sm">
          Don't miss out on this exclusive deal
        </p>
      </div>
      
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
        <p className="text-red-900 font-semibold">Offer expires in 24 hours</p>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={onNext}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Claim Offer
        </button>
      )}
    </div>
  )
}

const SuccessStep = ({ onNext, showButton = true, skippedSteps = [], onboardingData }: StepProps & { showButton?: boolean; skippedSteps?: number[] }) => {
  const [showSkippedSteps, setShowSkippedSteps] = useState(false)
  const [currentSkippedStep, setCurrentSkippedStep] = useState<number | null>(null)

  const handleGoToDashboard = () => {
    if (skippedSteps.length > 0) {
      setShowSkippedSteps(true)
      setCurrentSkippedStep(skippedSteps[0])
    } else {
      onNext()
    }
  }

  const handleSkippedStepComplete = () => {
    const remainingSteps = skippedSteps.filter(step => step !== currentSkippedStep)
    if (remainingSteps.length > 0) {
      setCurrentSkippedStep(remainingSteps[0])
    } else {
      onNext() // Go to dashboard
    }
  }

  // If showing skipped steps, render the skipped step
  if (showSkippedSteps && currentSkippedStep) {
    const step = ONBOARDING_STEPS.find(s => s.id === currentSkippedStep)
    if (step) {
      const StepComponent = step.component
      return (
        <div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              ⚠️ This step was skipped earlier. Please complete it to finish setting up your account.
            </p>
          </div>
          {onboardingData ? (
            <StepComponent 
              onNext={handleSkippedStepComplete}
              updateData={() => {}}
              onboardingData={onboardingData}
              setSkippedSteps={() => {}}
              showButton={true}
            />
          ) : (
            <div>Loading...</div>
          )}
        </div>
      )
    }
  }

  return (
    <div className="text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Axle!</h2>
        <p className="text-gray-600">
          Your account has been created successfully
        </p>
      </div>
      
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
        <p className="text-green-900">You're all set to start tracking your vehicle maintenance!</p>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={handleGoToDashboard}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
        >
          Go to Dashboard
        </button>
      )}
    </div>
  )
}

const DashboardRedirect = ({ onboardingData, setCurrentStep }: { onboardingData: OnboardingData; setCurrentStep?: (step: number) => void }) => {
  const router = useRouter()

  useEffect(() => {
    const completeOnboarding = async () => {
      try {
        // Check if required steps were completed
        if (!onboardingData.userId) {
          // User skipped account creation
          alert('Please create an account to save your information')
          if (setCurrentStep) {
            setCurrentStep(14) // Go back to account creation
          }
          return
        }

        // Get pending onboarding data from localStorage
        const pendingData = localStorage.getItem('pendingOnboarding')
        if (pendingData) {
          const data = JSON.parse(pendingData)
          
          // Call API to save onboarding data
          const response = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ onboardingData: data }),
          })

          if (!response.ok) {
            console.error('Failed to save onboarding data')
          }
        }

        // Clear localStorage
        localStorage.removeItem('onboardingData')
        localStorage.removeItem('pendingOnboarding')
        
        // Redirect to dashboard
        router.push('/')
      } catch (error) {
        console.error('Error completing onboarding:', error)
        router.push('/')
      }
    }

    completeOnboarding()
  }, [router, onboardingData.userId, setCurrentStep])

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Setting up your account...</h2>
      </div>
    </div>
  )
}

// Wrapper component for DashboardRedirect
const DashboardRedirectWrapper = ({ onboardingData }: { onboardingData: OnboardingData }) => {
  const [currentStepState, setCurrentStepState] = useState(1)
  
  return (
    <DashboardRedirect 
      onboardingData={onboardingData} 
      setCurrentStep={setCurrentStepState} 
    />
  )
}

// Helper function to create user with onboarding data
const createUserWithOnboardingData = async (userId: string, onboardingData: OnboardingData) => {
  try {
    // First get the user's auth data
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    // Now insert/update user data
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      role: 'customer',
      vehicles: [onboardingData.vehicle, ...onboardingData.additionalVehicles],
      referral_source: onboardingData.referralSource,
      last_service: onboardingData.lastService,
      location: onboardingData.location,
      phone: onboardingData.phoneNumber,
      notifications_enabled: onboardingData.notifications,
      subscription_plan: onboardingData.plan,
      subscription_status: onboardingData.freeTrial ? 'trial' : 'inactive',
      free_trial_ends_at: onboardingData.freeTrial ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      onboarding_completed: true,
      onboarding_data: onboardingData,
      created_at: new Date().toISOString()
    })

    if (error) throw error
  } catch (error) {
    console.error('Error creating user with onboarding data:', error)
  }
}

// Main onboarding component
const ONBOARDING_STEPS = [
  { id: 1, title: "Vehicle Information", component: VehicleInfoStep },
  { id: 2, title: "How did you find us?", component: ReferralSourceStep },
  { id: 3, title: "Previous Apps", component: PreviousAppsStep },
  { id: 4, title: "Why Axle is Better", component: WhyAxleStep },
  { id: 5, title: "Last Service", component: LastServiceStep },
  { id: 6, title: "Thank You", component: ThankYouStep },
  { id: 7, title: "Axle AI Benefits", component: BenefitsStep },
  { id: 8, title: "Location", component: LocationStep },
  { id: 9, title: "Notifications", component: NotificationsStep },
  { id: 10, title: "Add Another Car", component: AddVehicleStep },
  { id: 11, title: "Maintenance Schedule", component: MaintenanceStep },
  { id: 12, title: "Setting Up", component: SettingUpStep },
  { id: 13, title: "Plan Ready", component: PlanReadyStep },
  { id: 14, title: "Create Account", component: CreateAccountStep },
  { id: 15, title: "Phone Number", component: PhoneNumberStep },
  { id: 16, title: "Free Trial", component: FreeTrialStep },
  { id: 17, title: "Choose Plan", component: ChoosePlanStep },
  { id: 18, title: "Limited Offer", component: LimitedOfferStep },
  { id: 19, title: "Success", component: SuccessStep },
  { id: 20, title: "Dashboard", component: DashboardRedirectWrapper }
]

export default function CustomerOnboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [skippedSteps, setSkippedSteps] = useState<number[]>([])
  const [carAnimating, setCarAnimating] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    vehicle: {
      year: '',
      make: '',
      model: '',
      vin: '',
      mileage: '',
      licensePlate: ''
    },
    referralSource: '',
    usedOtherApps: null,
    lastService: {
      date: '',
      type: '',
      mileage: ''
    },
    location: null,
    notifications: false,
    additionalVehicles: [],
    userId: null,
    phoneNumber: '',
    plan: null,
    freeTrial: false
  })

  // Load step from URL params (for auth callback)
  useEffect(() => {
    const stepParam = searchParams.get('step')
    const userIdParam = searchParams.get('userId')
    
    // Only jump to a different step if explicitly set in URL and valid
    if (stepParam && !isNaN(parseInt(stepParam))) {
      const stepNumber = parseInt(stepParam)
      if (stepNumber >= 1 && stepNumber <= 20) {
        setCurrentStep(stepNumber)
      }
    }
    
    if (userIdParam) {
      setOnboardingData(prev => ({ ...prev, userId: userIdParam }))
    }
  }, [searchParams])

  // Save to localStorage on each update (before auth)
  useEffect(() => {
    if (currentStep < 14) {
      localStorage.setItem('onboardingData', JSON.stringify(onboardingData))
    }
  }, [onboardingData, currentStep])

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData')
    if (savedData) {
      setOnboardingData(JSON.parse(savedData))
    }
  }, [])

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentStep])

  // Confetti effect when reaching step 20
  useEffect(() => {
    if (currentStep === 20 && typeof window !== 'undefined') {
      // Simple confetti effect
      const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171'];
      const confettiCount = 50;
      
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.opacity = '1';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.transition = 'all 3s ease-out';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
          confetti.style.top = '100vh';
          confetti.style.opacity = '0';
          confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
        }, 10);
        
        setTimeout(() => {
          document.body.removeChild(confetti);
        }, 3000);
      }
    }
  }, [currentStep]);

  const updateData = (newData: Partial<OnboardingData>) => {
    console.log('Updating onboarding data:', newData);
    setOnboardingData(prev => ({ ...prev, ...newData }))
  }

  const handleNext = () => {
    if (currentStep < 20) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep === 1) {
      // Navigate to welcome page on step 1
      router.push('/welcome')
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCarClick = () => {
    // Trigger animation
    setCarAnimating(true);
    
    // Play sound effect (optional)
    const audio = new Audio('/sounds/car-honk.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
    
    // Reset animation after duration
    setTimeout(() => {
      setCarAnimating(false);
    }, 600);
  };

  const nextStep = () => {
    handleNext()
  }

  const renderContinueButton = () => {
    const currentStepData = ONBOARDING_STEPS[currentStep - 1];
    
    // Different buttons for different steps
    switch(currentStep) {
      case 14: // Create Account Step
        return (
          <>
            <div className="text-center mb-2">
              <span className="text-gray-500 text-sm">
                Would like to sign in later?{' '}
                <button
                  onClick={() => {
                    if (setSkippedSteps) {
                      setSkippedSteps((prev: number[]) => [...prev, 14])
                    }
                    nextStep()
                  }}
                  className="italic underline hover:text-gray-700"
                >
                  Skip
                </button>
              </span>
            </div>
          </>
        );
      case 15: // Phone Number Step
        return (
          <>
            <button
              onClick={() => {
                // Get phone number from form state or handle appropriately
                nextStep()
              }}
              className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
            >
              Continue
            </button>
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  if (setSkippedSteps) {
                    setSkippedSteps((prev: number[]) => [...prev, 15])
                  }
                  nextStep()
                }}
                className="text-gray-500 hover:text-gray-700 underline text-sm"
              >
                Skip for now
              </button>
            </div>
          </>
        );
      case 20: // Final step
        return (
          <button
            onClick={() => {
              // Handle completion
              nextStep()
            }}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Complete Setup
          </button>
        );
      default:
        return (
          <button
            onClick={nextStep}
            className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
          >
            Continue
          </button>
        );
    }
  };

  const renderCurrentStep = ({ showButton = true }: { showButton?: boolean } = {}) => {
    const step = ONBOARDING_STEPS.find(s => s.id === currentStep)
    if (!step) return null

    const StepComponent = step.component
    return (
      <div>
        <StepComponent 
          onNext={nextStep}
          updateData={updateData}
          onboardingData={onboardingData}
          setSkippedSteps={setSkippedSteps}
          showButton={showButton}
          skippedSteps={currentStep === 20 ? skippedSteps : undefined}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <SiteHeader />
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Progress Bar */}
        <div className={currentStep === 14 ? "mb-2" : "mb-4"}>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center px-3 py-2 rounded-lg transition-colors text-[#294a46] hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
              <div 
                className="bg-[#294a46] h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(currentStep / 20) * 100}%` }}
              />
              {/* Race car emoji that moves with progress */}
              <div 
                className="absolute top-0 transform -translate-y-1/2 transition-all duration-300"
                style={{ left: `calc(${(currentStep / 20) * 100}% - 16px)` }}
              >
                <span className="text-2xl">🏎️</span>
              </div>
              {/* Finish flag at the end */}
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2">
                <span className="text-lg">🏁</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Card - No white background for step 14 */}
        {currentStep === 14 ? (
          <div>
            {/* Step content with buttons - no white background */}
            <div id="step-content">
              {renderCurrentStep({ showButton: true })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl border-0">
            <div className="p-8">
              {/* Step content with buttons */}
              <div id="step-content">
                {renderCurrentStep({ showButton: true })}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
