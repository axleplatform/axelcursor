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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Input Your Vehicle Information</h2>
        <p className="text-sm text-gray-600 leading-tight">Tell us about your car so we can provide accurate service recommendations</p>
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

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={() => {
            updateData({ vehicle })
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

const ReferralSourceStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  
  const sources = [
    'Google Search',
    'App Store',
    'Friend/Family',
    'Instagram',
    'TikTok',
    'YouTube',
    'TV',
    'Facebook',
    'Other'
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Where did you hear from us?
        </h2>
        <p className="text-gray-600">
          Help us understand how you found Axle (select all that apply)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {sources.map(source => (
          <button
            key={source}
            onClick={() => toggleSource(source)}
            className={`p-6 text-left border-2 rounded-lg transition-all group ${
              selectedSources.includes(source)
                ? 'border-[#294a46] bg-[#e6eeec]'
                : 'border-gray-200 hover:border-[#294a46] hover:bg-[#e6eeec]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`font-medium group-hover:text-[#294a46] ${
                selectedSources.includes(source) ? 'text-[#294a46]' : 'text-gray-900'
              }`}>
                {source}
              </h3>
              {selectedSources.includes(source) && (
                <div className="w-5 h-5 bg-[#294a46] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Have you used other car service apps?
        </h2>
        <p className="text-gray-600">
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Why Axle AI is Better
        </h2>
        <p className="text-gray-600">
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Last Service Information</h2>
        <p className="text-gray-600">
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Axle AI Benefits</h2>
        <p className="text-gray-600">
          Discover what makes Axle AI the smart choice for car maintenance
        </p>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg">
          <div className="text-2xl">🎯</div>
          <div>
            <h3 className="font-semibold text-gray-900">Predictive Maintenance</h3>
            <p className="text-gray-600">AI predicts when your car needs service</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg">
          <div className="text-2xl">💰</div>
          <div>
            <h3 className="font-semibold text-gray-900">Cost Savings</h3>
            <p className="text-gray-600">Save up to 40% on car maintenance</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg">
          <div className="text-2xl">🔧</div>
          <div>
            <h3 className="font-semibold text-gray-900">Expert Mechanics</h3>
            <p className="text-gray-600">Vetted professionals in your area</p>
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Where are you located?</h2>
        <p className="text-gray-600">
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

const NotificationsStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Stay Updated</h2>
        <p className="text-gray-600">
          Get notified about maintenance reminders and service updates
        </p>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={() => {
            updateData({ notifications: true })
            onNext()
          }}
          className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-[#294a46] hover:bg-[#e6eeec] transition-all group"
        >
          <h3 className="font-medium text-gray-900 group-hover:text-[#294a46]">
            Yes, keep me updated
          </h3>
        </button>
        
        <button
          onClick={() => {
            updateData({ notifications: false })
            onNext()
          }}
          className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-[#294a46] hover:bg-[#e6eeec] transition-all group"
        >
          <h3 className="font-medium text-gray-900 group-hover:text-[#294a46]">
            Maybe later
          </h3>
        </button>
      </div>
    </div>
  )
}

const AddVehicleStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [additionalVehicles, setAdditionalVehicles] = useState<Vehicle[]>([])
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>({
    year: '',
    make: '',
    model: '',
    vin: '',
    mileage: '',
    licensePlate: ''
  })

  const addVehicle = () => {
    if (currentVehicle.year && currentVehicle.make && currentVehicle.model) {
      setAdditionalVehicles([...additionalVehicles, currentVehicle])
      setCurrentVehicle({ 
        year: '', 
        make: '', 
        model: '', 
        vin: '', 
        mileage: '', 
        licensePlate: '' 
      })
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Another Vehicle?</h2>
        <p className="text-gray-600">
          Do you have additional vehicles you'd like to track?
        </p>
      </div>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Year
          </label>
          <input 
            type="number" 
            placeholder="2020"
            value={currentVehicle.year}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentVehicle({...currentVehicle, year: e.target.value})}
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
            value={currentVehicle.make}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentVehicle({...currentVehicle, make: e.target.value})}
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
            value={currentVehicle.model}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentVehicle({...currentVehicle, model: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
          />
        </div>
        
        <button 
          onClick={addVehicle}
          className="w-full bg-gray-100 text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors font-medium py-3 px-6"
        >
          Add Vehicle
        </button>
      </div>

      {additionalVehicles.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2 text-gray-900">Added Vehicles:</h3>
          {additionalVehicles.map((vehicle, index) => (
            <div key={index} className="p-4 bg-gray-100 rounded-lg mb-2">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
          ))}
        </div>
      )}

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={() => {
            updateData({ additionalVehicles })
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

const MaintenanceStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Maintenance Schedule</h2>
        <p className="text-gray-600">
          We'll create a personalized maintenance schedule for your vehicle
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Setting Up Your Account</h2>
        <p className="text-gray-600">
          We're configuring your personalized experience...
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Plan is Ready!</h2>
        <p className="text-gray-600">
          Based on your vehicle information, here's your personalized maintenance plan
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Phone Number</h2>
        <p className="text-gray-600">
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Free Trial</h2>
        <p className="text-gray-600">
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Limited Time Offer!</h2>
        <p className="text-gray-600">
          Get 50% off your first 3 months of Premium
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

const SuccessStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
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
          onClick={onNext}
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
  { id: 10, title: "Add Another Vehicle", component: AddVehicleStep },
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

  const updateData = (newData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...newData }))
  }

  const handleNext = () => {
    if (currentStep === 19 && skippedSteps.length > 0) {
      // Before going to step 20, show the first skipped step
      const nextSkippedStep = skippedSteps[0]
      setCurrentStep(nextSkippedStep)
      setSkippedSteps(prev => prev.filter(step => step !== nextSkippedStep))
    } else if (currentStep < 20) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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
              <button
                onClick={() => {
                  if (setSkippedSteps) {
                    setSkippedSteps((prev: number[]) => [...prev, 14])
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
        {/* Visual indicator for re-inserted steps */}
        {skippedSteps.includes(currentStep) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              ⚠️ This step was skipped earlier. Please complete it to finish setting up your account.
            </p>
          </div>
        )}
        
        <StepComponent 
          onNext={nextStep}
          updateData={updateData}
          onboardingData={onboardingData}
          setSkippedSteps={setSkippedSteps}
          showButton={showButton}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Racing Progress Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
            {/* Mobile: Simplified header with back button only */}
            <div className="flex items-center justify-between mb-3 md:hidden">
              {/* Back Button */}
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`flex items-center gap-1 ${
                  currentStep === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 active:text-blue-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Empty div for spacing balance */}
              <div className="w-5"></div>
            </div>

            {/* Desktop: Keep original with full text */}
            <div className="hidden md:flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Step {currentStep} of 20</span>
              <span className="text-sm font-medium text-gray-700">{Math.round((currentStep / 20) * 100)}% Complete</span>
            </div>

            {/* Racing Track Progress Bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#294a46] h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Card with padding bottom on mobile */}
        <div className="bg-white rounded-lg shadow-xl border-0 mb-20 md:mb-0">
          <div className="p-8 pb-24 md:pb-8">
            {/* Step content without buttons */}
            <div id="step-content" className="step-content-mobile">
              {renderCurrentStep({ showButton: false })}
            </div>
          </div>
        </div>

        {/* Fixed Continue Button Container - Mobile Only */}
        <div 
          className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden fixed-bottom-button"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}
        >
          {renderContinueButton()}
        </div>

        {/* Desktop Continue Button - Inside Card */}
        <div className="hidden md:block">
          <div className="bg-white rounded-lg shadow-xl border-0 mt-4">
            <div className="p-8">
              {renderContinueButton()}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

