"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Check } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { GoogleSignInButton } from '@/components/google-signin-button'
import { CustomerSignupForm } from '@/components/customer-signup-form'
import { SiteHeader } from '@/components/site-header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { useOnboardingTracking } from '@/hooks/useOnboardingTracking'
import { validateSessionForNavigation, waitForSessionEstablishment, validateSessionWithRetry } from '@/lib/session-utils'

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

// Car makes and models data
const CAR_MAKES = [
  "Acura", "Alfa Romeo", "Alpine", "Aston Martin", "Audi", "Bentley", "BMW", "Bugatti", "Buick", "Cadillac", 
  "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Fisker", "Ford", "Genesis", "GMC", "Honda", "Hummer", 
  "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Koenigsegg", "Lamborghini", "Land Rover", "Lexus", "Lincoln", 
  "Lotus", "Lucid", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "Mercury", "Mini", "Mitsubishi", "Nissan", 
  "Oldsmobile", "Pagani", "Plymouth", "Polestar", "Pontiac", "Porsche", "Ram", "Rivian", "Rolls-Royce", "Saturn", 
  "Scion", "Smart", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
]

const CAR_MODELS: Record<string, string[]> = {
  // Main brands with full model lists
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "4Runner", "Tacoma", "Tundra", "Prius", "Sienna", "Avalon"],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline", "Fit", "Passport", "Insight"],
  Ford: ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Ranger", "Expedition", "Bronco", "Fusion", "Focus"],
  Chevrolet: ["Silverado", "Equinox", "Tahoe", "Traverse", "Malibu", "Camaro", "Suburban", "Colorado", "Blazer", "Trax"],
  BMW: ["3 Series", "5 Series", "X3", "X5", "7 Series", "X1", "X7", "4 Series", "2 Series", "i4"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE", "S-Class", "A-Class", "GLA", "GLB", "CLA", "G-Class"],
  Audi: ["A4", "Q5", "A6", "Q7", "A3", "Q3", "A5", "Q8", "e-tron", "A7"],
  Nissan: ["Altima", "Rogue", "Sentra", "Pathfinder", "Murano", "Frontier", "Kicks", "Armada", "Maxima", "Titan"],
  Hyundai: ["Elantra", "Tucson", "Santa Fe", "Sonata", "Kona", "Palisade", "Venue", "Accent", "Ioniq", "Veloster"],
  Kia: ["Forte", "Sportage", "Sorento", "Soul", "Telluride", "Seltos", "Rio", "Niro", "Carnival", "K5"],
  Subaru: ["Outback", "Forester", "Crosstrek", "Impreza", "Ascent", "Legacy", "WRX", "BRZ", "Solterra"],
  Volkswagen: ["Jetta", "Tiguan", "Atlas", "Passat", "Golf", "Taos", "ID.4", "Arteon", "Atlas Cross Sport"],
  Jeep: ["Grand Cherokee", "Wrangler", "Cherokee", "Compass", "Renegade", "Gladiator", "Wagoneer", "Grand Wagoneer"],
  Lexus: ["RX", "NX", "ES", "GX", "IS", "UX", "LX", "LS", "RC", "LC"],
  Mazda: ["CX-5", "Mazda3", "CX-9", "CX-30", "Mazda6", "MX-5 Miata", "CX-50"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  Acura: ["MDX", "RDX", "TLX", "ILX", "NSX", "Integra"],
  Buick: ["Encore", "Enclave", "Envision", "Encore GX"],
  Cadillac: ["XT5", "Escalade", "XT4", "CT5", "XT6", "CT4"],
  Chrysler: ["Pacifica", "300"],
  Dodge: ["Charger", "Challenger", "Durango", "Hornet"],
  GMC: ["Sierra", "Terrain", "Acadia", "Yukon", "Canyon", "Hummer EV"],
  Infiniti: ["QX60", "QX50", "QX80", "Q50", "QX55"],
  Lincoln: ["Corsair", "Nautilus", "Aviator", "Navigator"],
  Mitsubishi: ["Outlander", "Eclipse Cross", "Outlander Sport", "Mirage"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan", "718 Cayman", "718 Boxster"],
  Ram: ["1500", "2500", "3500", "ProMaster"],
  Volvo: ["XC90", "XC60", "XC40", "S60", "S90", "V60", "V90"],
  
  // Additional makes with popular models
  Genesis: ["G70", "G80", "G90", "GV70", "GV80", "GV60"],
  Polestar: ["Polestar 1", "Polestar 2", "Polestar 3", "Polestar 4"],
  Rivian: ["R1T", "R1S", "R2", "R3"],
  Lucid: ["Air", "Gravity", "Sapphire"],
  Fisker: ["Ocean", "Pear", "Rönde", "Alaska"],
  Pagani: ["Huayra", "Zonda", "Utopia"],
  Bugatti: ["Chiron", "Veyron", "Divo", "Mistral"],
  Koenigsegg: ["Jesko", "Gemera", "Regera", "Agera"],
  Alpine: ["A110", "A310", "GTA"],
  Lotus: ["Emira", "Evija", "Eletre", "Elise", "Exige"],
  Smart: ["Fortwo", "Forfour", "EQ Fortwo"],
  Scion: ["tC", "xB", "xD", "iQ", "FR-S"],
  Saturn: ["Ion", "Vue", "Aura", "Outlook", "Sky"],
  Pontiac: ["G6", "G8", "Solstice", "Vibe", "Torrent"],
  Hummer: ["H1", "H2", "H3", "H3T"],
  Oldsmobile: ["Alero", "Aurora", "Bravada", "Cutlass", "Intrigue"],
  Mercury: ["Milan", "Mariner", "Mountaineer", "Sable", "Grand Marquis"],
  Plymouth: ["Prowler", "Neon", "Breeze", "Voyager"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale", "Giulietta", "4C"],
  "Aston Martin": ["DB11", "Vantage", "DBS", "DBX", "Valkyrie"],
  Bentley: ["Continental", "Flying Spur", "Bentayga", "Mulliner"],
  Ferrari: ["F8", "SF90", "296", "Roma", "Portofino", "812"],
  Fiat: ["500", "500X", "124 Spider", "Panda", "Tipo"],
  "Land Rover": ["Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque", "Discovery", "Defender"],
  Maserati: ["Ghibli", "Quattroporte", "Levante", "Grecale", "MC20"],
  McLaren: ["720S", "765LT", "Artura", "GT", "Senna"],
  Mini: ["Cooper", "Countryman", "Clubman", "Convertible", "Electric"],
  "Rolls-Royce": ["Phantom", "Ghost", "Wraith", "Dawn", "Cullinan"]
}

const GENERIC_MODELS = ["Sedan", "SUV", "Coupe", "Truck", "Hatchback", "Convertible", "Wagon", "Van", "Crossover"]

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

  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [showMakeDropdown, setShowMakeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for form fields
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  // Generate years (80 years back)
  const currentYear = new Date().getFullYear()
  const allYears = Array.from({length: 80}, (_, i) => (currentYear - i).toString())
  
  // Filter years based on input
  const filteredYears = allYears.filter(year => year.includes(vehicle.year))
  
  // Filter makes based on input
  const filteredMakes = CAR_MAKES.filter(make => 
    make.toLowerCase().includes(vehicle.make.toLowerCase())
  )
  
  // Get models for selected make
  const availableModels = vehicle.make ? (CAR_MODELS[vehicle.make] || GENERIC_MODELS) : []
  const filteredModels = availableModels.filter(model => 
    model.toLowerCase().includes(vehicle.model.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Input Your Vehicle Information</h2>
        <p className="text-sm text-gray-600">
          Tell us about your car so we can provide accurate service recommendations
        </p>
      </div>
      
      <div className="space-y-4">
        <div className={`grid grid-cols-3 gap-4 transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          {/* YEAR - Combo Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <input 
              type="text"
              placeholder="2020"
              value={vehicle.year}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value
                setVehicle({...vehicle, year: value})
              }}
              onFocus={() => setShowYearDropdown(true)}
              onBlur={() => setTimeout(() => setShowYearDropdown(false), 200)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
            
            {/* Year Dropdown */}
            {showYearDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredYears.length > 0 ? (
                  filteredYears.map(year => (
                    <button
                      key={year}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setVehicle({...vehicle, year})
                        setShowYearDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50"
                    >
                      {year}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500">
                    Custom year: {vehicle.year}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* MAKE - Combo Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Make
            </label>
            <input 
              type="text"
              placeholder="Toyota"
              value={vehicle.make}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value
                setVehicle({...vehicle, make: value, model: ''}) // Reset model
              }}
              onFocus={() => setShowMakeDropdown(true)}
              onBlur={() => setTimeout(() => setShowMakeDropdown(false), 200)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
            />
            
            {/* Make Dropdown */}
            {showMakeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredMakes.length > 0 ? (
                  filteredMakes.map(make => (
                    <button
                      key={make}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setVehicle({...vehicle, make, model: ''})
                        setShowMakeDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50"
                    >
                      {make}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500">
                    Custom make: {vehicle.make}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* MODEL - Combo Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <input 
              type="text"
              placeholder="Camry"
              value={vehicle.model}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value
                setVehicle({...vehicle, model: value})
              }}
              onFocus={() => setShowModelDropdown(true)}
              onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
              disabled={!vehicle.make}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent disabled:bg-gray-100"
            />
            
            {/* Model Dropdown */}
            {showModelDropdown && vehicle.make && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredModels.length > 0 ? (
                  filteredModels.map(model => (
                    <button
                      key={model}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setVehicle({...vehicle, model})
                        setShowModelDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50"
                    >
                      {model}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500">
                    Custom model: {vehicle.model}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Mileage, License Plate */}
        <div className={`grid grid-cols-2 gap-4 transition-all duration-500 delay-200 ${
          visibleItems >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
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
        <div className={`transition-all duration-500 delay-400 ${
          visibleItems >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
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
  const [selected, setSelected] = useState<string[]>([])

  const sources = [
    { 
      name: 'Google Search', 
      icon: (
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
      icon: (
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
          <svg className="w-4 h-4" viewBox="0 0 14 17" fill="white">
            <path d="M11.73 8.05c-.01-1.84 1.5-2.73 1.57-2.77-.86-1.25-2.19-1.42-2.66-1.44-1.13-.12-2.21.67-2.78.67-.58 0-1.47-.65-2.41-.64-1.24.02-2.39.73-3.03 1.85-1.29 2.24-.33 5.56.93 7.38.62.89 1.35 1.89 2.32 1.85.93-.04 1.28-.6 2.41-.6s1.44.6 2.42.58c1-.02 1.64-.91 2.25-1.8.71-1.04 1-2.04 1.01-2.09-.02-.01-1.94-.75-1.96-2.96l-.07-.13zm-1.84-5.45c.51-.62.86-1.48.76-2.34-.74.03-1.63.49-2.16 1.11-.47.55-.89 1.43-.78 2.27.82.07 1.66-.42 2.18-1.04z"/>
          </svg>
        </div>
      )
    },
    { 
      name: 'Friend/Family', 
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#6B7280">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      )
    },
    { 
      name: 'Instagram', 
      icon: (
        <div className="w-6 h-6">
          <svg viewBox="0 0 24 24">
            <defs>
              <linearGradient id="igGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FED576"/>
                <stop offset="25%" stopColor="#F47133"/>
                <stop offset="50%" stopColor="#BC3081"/>
                <stop offset="100%" stopColor="#4C63D2"/>
              </linearGradient>
            </defs>
            <rect width="24" height="24" rx="6" fill="url(#igGradient)"/>
            <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5"/>
            <circle cx="18" cy="6" r="1.5" fill="white"/>
          </svg>
        </div>
      )
    },
    { 
      name: 'TikTok', 
      icon: (
        <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
          <svg className="w-4 h-4" viewBox="0 0 20 24" fill="white">
            <path d="M17.24 0H13.03v16.28c0 1.94-1.57 3.52-3.5 3.52-1.93 0-3.5-1.58-3.5-3.52 0-1.89 1.49-3.43 3.35-3.51V8.52C5.38 8.6 2 11.72 2 15.76c0 4.1 3.49 7.43 7.78 7.43s7.78-3.33 7.78-7.43V7.93c1.57 1.12 3.47 1.78 5.54 1.83V5.51c-3.42-.13-5.86-2.85-5.86-5.51z"/>
          </svg>
        </div>
      )
    },
    { 
      name: 'YouTube', 
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    { 
      name: 'TV', 
      icon: (
        <svg className="w-6 h-6" fill="#4B5563" viewBox="0 0 24 24">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
        </svg>
      )
    },
    { 
      name: 'Facebook', 
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    { 
      name: 'Other', 
      icon: (
        <svg className="w-6 h-6" fill="#9CA3AF" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Where'd you hear us?</h2>
        <p className="text-sm text-gray-600">Select all that apply</p>
      </div>

      {/* Scrollable Options Container */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 mb-6" style={{ maxHeight: '400px' }}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sources.map((source) => (
            <button
              key={source.name}
              onClick={() => {
                setSelected(prev => 
                  prev.includes(source.name) 
                    ? prev.filter(s => s !== source.name)
                    : [...prev, source.name]
                );
              }}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selected.includes(source.name)
                  ? 'border-[#294a46] bg-[#e6eeec]'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {selected.includes(source.name) && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-[#294a46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              
              <div className="flex flex-col items-center gap-2">
                {source.icon}
                <span className="text-xs font-medium text-gray-700">{source.name}</span>
              </div>
            </button>
          ))}
          
          {/* Continue Button - Inline with other options */}
          <button
            onClick={() => {
              updateData({ referralSource: selected.join(', ') });
              onNext();
            }}
            className="relative p-4 rounded-lg border-2 border-[#294a46] bg-[#294a46] text-white hover:bg-[#1e3632] transition-all"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="font-medium">Continue</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviousAppsStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for options
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Have you used other car service apps?</h2>
        <p className="text-gray-600 text-sm">
          We'd like to understand your experience with similar services
        </p>
      </div>
      
      <div className="space-y-4">
        <div className={`transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
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
        </div>
        
        <div className={`transition-all duration-500 delay-100 ${
          visibleItems >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
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
    </div>
  )
}

const WhyAxleStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for checkmarks only
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What you'll get with Axle</h2>
        <p className="text-gray-600 text-sm">
          Here's what you can expect as a car owner on our platform
        </p>
      </div>
      
      {/* Checkmarks Section */}
      <div className="space-y-6 mb-8">
        {/* First Checkmark */}
        <div className={`flex items-center gap-3 transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
            <svg className="w-5 h-5 text-[#294a46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-lg font-medium text-gray-800">Quicker appointment booking</span>
        </div>

        {/* Second Checkmark */}
        <div className={`flex items-center gap-3 transition-all duration-500 delay-100 ${
          visibleItems >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
            <svg className="w-5 h-5 text-[#294a46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-lg font-medium text-gray-800">Visualize various live quotes</span>
        </div>

        {/* Third Checkmark */}
        <div className={`flex items-center gap-3 transition-all duration-500 delay-200 ${
          visibleItems >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
            <svg className="w-5 h-5 text-[#294a46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-lg font-medium text-gray-800">Multiple Mechanic Options</span>
        </div>
      </div>

      {/* User Satisfaction Message */}
      <div className="text-center py-4 border-t border-gray-100">
        <p className="text-sm text-gray-500">Over 80% of our users have avoided major issues</p>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <div>
          <button 
            onClick={onNext}
            className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium"
          >
            Continue
          </button>
        </div>
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
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for form fields
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

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
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Date</label>
            
            {/* Mobile-friendly date input wrapper */}
            <div className="relative">
              <input 
                type="date" 
                value={lastService.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastService({...lastService, date: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent appearance-none bg-white"
                style={{
                  colorScheme: 'light',
                  WebkitAppearance: 'none',
                }}
              />
              
              {/* Calendar icon overlay for mobile */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            {/* Helper text for mobile users */}
            <p className="text-xs text-gray-500 mt-1 md:hidden">
              Tap to select date
            </p>
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
        <div className={`transition-all duration-500 delay-200 ${
          visibleItems >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
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
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for content
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  return (
    <div className="text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you for trusting us!</h2>
        <p className="text-gray-600 mb-4">
          We're excited to help you take better care of your vehicle.
        </p>
        <div className={`text-4xl transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>🤝</div>
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
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for benefits
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Axle AI Benefits</h2>
        <p className="text-gray-600 text-sm">
          Discover what makes Axle AI the smart choice for car maintenance
        </p>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className={`flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="text-2xl">🎯</div>
          <div>
            <h3 className="font-semibold text-gray-900">Predictive Maintenance</h3>
            <p className="text-gray-600 text-sm">AI predict your next service</p>
          </div>
        </div>
        
        <div className={`flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg transition-all duration-500 delay-100 ${
          visibleItems >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="text-2xl">💰</div>
          <div>
            <h3 className="font-semibold text-gray-900">Cost Savings</h3>
            <p className="text-gray-600 text-sm">Reduce chance of hefty repairs</p>
          </div>
        </div>
        
        <div className={`flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg transition-all duration-500 delay-200 ${
          visibleItems >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
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
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for input
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Where are you located?</h2>
        <p className="text-gray-600 text-sm">
          Help us find mechanics and services near you
        </p>
      </div>
      
      <div className={`transition-all duration-500 ${
        visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}>
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

  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMakeDropdown, setShowMakeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Generate years (80 years back)
  const currentYear = new Date().getFullYear();
  const allYears = Array.from({length: 80}, (_, i) => (currentYear - i).toString());
  
  // Filter years based on input
  const filteredYears = allYears.filter(year => year.includes(newVehicle.year));
  
  // Filter makes based on input
  const filteredMakes = CAR_MAKES.filter(make => 
    make.toLowerCase().includes(newVehicle.make.toLowerCase())
  );
  
  // Get models for selected make
  const availableModels = newVehicle.make ? (CAR_MODELS[newVehicle.make] || GENERIC_MODELS) : [];
  const filteredModels = availableModels.filter(model => 
    model.toLowerCase().includes(newVehicle.model.toLowerCase())
  );

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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Add Vehicle {totalVehicles + 1}
          </h3>
          
          {/* Same form fields as Step 1 with combo inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* YEAR - Combo Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input 
                  type="text"
                  placeholder="2020"
                  value={newVehicle.year}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value
                    setNewVehicle({...newVehicle, year: value})
                  }}
                  onFocus={() => setShowYearDropdown(true)}
                  onBlur={() => setTimeout(() => setShowYearDropdown(false), 200)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
                
                            {/* Year Dropdown */}
            {showYearDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredYears.length > 0 ? (
                  filteredYears.map(year => (
                    <button
                      key={year}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setNewVehicle({...newVehicle, year})
                        setShowYearDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50"
                    >
                      {year}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500">
                    Custom year: {newVehicle.year}
                  </div>
                )}
              </div>
            )}
              </div>
              
              {/* MAKE - Combo Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make
                </label>
                <input 
                  type="text"
                  placeholder="Toyota"
                  value={newVehicle.make}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value
                    setNewVehicle({...newVehicle, make: value, model: ''}) // Reset model
                  }}
                  onFocus={() => setShowMakeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowMakeDropdown(false), 200)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
                
                {/* Make Dropdown */}
                {showMakeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMakes.length > 0 ? (
                      filteredMakes.map(make => (
                        <button
                          key={make}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setNewVehicle({...newVehicle, make, model: ''})
                            setShowMakeDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50"
                        >
                          {make}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">
                        Custom make: {newVehicle.make}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* MODEL - Combo Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input 
                  type="text"
                  placeholder="Camry"
                  value={newVehicle.model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value
                    setNewVehicle({...newVehicle, model: value})
                  }}
                  onFocus={() => setShowModelDropdown(true)}
                  onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                  disabled={!newVehicle.make}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent disabled:bg-gray-100"
                />
                
                {/* Model Dropdown */}
                {showModelDropdown && newVehicle.make && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredModels.length > 0 ? (
                      filteredModels.map(model => (
                        <button
                          key={model}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setNewVehicle({...newVehicle, model})
                            setShowModelDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50"
                        >
                          {model}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">
                        Custom model: {newVehicle.model}
                      </div>
                    )}
                  </div>
                )}
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
                  License Plate
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
      
      <div className="bg-[#e6eeec] border-2 border-[#294a46] rounded-lg p-6 mb-4">
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
            Fluid level checks
          </li>
        </ul>
      </div>

      <p className="text-center text-gray-600 mb-8">Have axle ai automate your reliability</p>

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
    <div className="-mt-8 md:-mt-32">
      <CustomerSignupForm 
        isOnboarding={true}
        onboardingData={onboardingData}
        onSuccess={(userId: string) => {
          if (userId === 'skipped') {
            handleSkip();
          } else {
            updateData({ userId });
            onNext();
          }
        }}
      />
    </div>
  );
};

const PhoneNumberStep = ({ onNext, updateData, setSkippedSteps, showButton = true, onboardingData }: StepProps & { showButton?: boolean }) => {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [visibleItems, setVisibleItems] = useState(0)
  const [isCreatingPhoneUser, setIsCreatingPhoneUser] = useState(false)

  // Animation effect for input
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  // Check if user was created in Step 14
  const hasAccount = onboardingData?.userId || false

  const handleContinue = async () => {
    if (!hasAccount && !phoneNumber.trim()) {
      alert('Please enter your phone number to continue')
      return
    }

    // Determine auth method based on user's choices
    let authMethod = 'email'; // Default to email if user has account
    
    if (hasAccount && phoneNumber.trim()) {
      authMethod = 'both'; // User has account AND entered phone
    } else if (!hasAccount && phoneNumber.trim()) {
      authMethod = 'phone'; // User skipped account but entered phone
    } else if (hasAccount && !phoneNumber.trim()) {
      authMethod = 'email'; // User has account but skipped phone
    }
    
    console.log('🔐 Auth method determination:');
    console.log('🔐 - User has account (Step 14):', hasAccount);
    console.log('🔐 - User entered phone (Step 15):', !!phoneNumber.trim());
    console.log('🔐 - Determined auth_method:', authMethod);

    if (!hasAccount && phoneNumber.trim()) {
      // Create phone-based user
      setIsCreatingPhoneUser(true)
      try {
        console.log('📱 Creating phone-based user...')
        
        // Use existing phone auth pattern to create user
        const normalizedPhone = phoneNumber.replace(/\D/g, '')
        
        // Create temporary user first (using existing pattern)
        const { data: tempUserId, error: tempUserError } = await (supabase as any).rpc('create_temporary_user')
        
        if (tempUserError) {
          console.error('❌ Error creating temporary user:', tempUserError)
          alert('Failed to create account. Please try again.')
          return
        }

        // Update user with phone number and proper account type
        const { error: updateError } = await supabase
          .from('users')
          .update({
            phone: normalizedPhone,
            account_type: 'phone_only',
            profile_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', tempUserId)

        if (updateError) {
          console.error('❌ Error updating user with phone:', updateError)
          alert('Failed to create account. Please try again.')
          return
        }

        // Create user profile with determined auth method
        const profileData = {
          user_id: tempUserId,
          phone: normalizedPhone,
          onboarding_completed: true, // Phone-only users get full access immediately
          onboarding_type: 'customer',
          auth_method: authMethod, // Use determined auth method
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        console.log('📝 Creating phone user profile with auth_method:', authMethod);
        console.log('📝 Profile data:', profileData);

        const { data: profileResult, error: profileError } = await supabase
          .from('user_profiles')
          .insert(profileData)
          .select('id, onboarding_completed, auth_method')

        if (profileError) {
          console.error('❌ Error creating profile:', profileError)
          alert('Failed to create profile. Please try again.')
          return
        }

        console.log('✅ Phone-based user created successfully:', tempUserId)
        console.log('✅ Profile created with onboarding_completed:', profileResult?.[0]?.onboarding_completed)
        console.log('✅ Profile created with auth_method:', profileResult?.[0]?.auth_method)
        
        // Verify the profile was created correctly
        const { data: verificationProfile, error: verificationError } = await supabase
          .from('user_profiles')
          .select('onboarding_completed, auth_method')
          .eq('user_id', tempUserId)
          .single();
          
        if (verificationError) {
          console.error('❌ Error verifying phone user profile:', verificationError);
        } else {
          console.log('✅ Phone user profile verification:');
          console.log('✅ - onboarding_completed:', verificationProfile?.onboarding_completed);
          console.log('✅ - auth_method:', verificationProfile?.auth_method);
          if (!verificationProfile?.onboarding_completed) {
            console.error('❌ CRITICAL: Phone user profile shows onboarding_completed: false!');
          }
          if (verificationProfile?.auth_method !== authMethod) {
            console.error('❌ CRITICAL: Phone user profile shows wrong auth_method!');
            console.error('❌ Expected:', authMethod, 'Got:', verificationProfile?.auth_method);
          }
        }
        
        // Update onboarding data with new user ID
        updateData({ 
          phoneNumber: normalizedPhone,
          userId: tempUserId 
        })
        
        onNext()
      } catch (error) {
        console.error('❌ Error creating phone-based user:', error)
        alert('Failed to create account. Please try again.')
      } finally {
        setIsCreatingPhoneUser(false)
      }
    } else {
      // User has account or phone is optional - update existing profile with auth_method
      if (hasAccount) {
        console.log('📝 User has account, updating existing profile with auth_method:', authMethod);
        
        try {
          // Get current user to find their profile
          const { data: { user } } = await (supabase.auth as any).getUser();
          if (user) {
            // Update existing profile with auth_method
            const { data: updateResult, error: updateError } = await supabase
              .from('user_profiles')
              .update({
                phone: phoneNumber.trim() || null,
                auth_method: authMethod,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .select('id, auth_method, phone');
              
            if (updateError) {
              console.error('❌ Error updating profile with auth_method:', updateError);
            } else {
              console.log('✅ Profile updated successfully:');
              console.log('✅ - auth_method:', updateResult?.[0]?.auth_method);
              console.log('✅ - phone:', updateResult?.[0]?.phone);
            }
          }
        } catch (error) {
          console.error('❌ Error updating profile:', error);
        }
      }
      
      // Update onboarding data
      updateData({ phoneNumber })
      onNext()
    }
  }

  const handleSkip = () => {
    if (!hasAccount) {
      alert('Please enter your phone number to continue')
      return
    }
    
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
          {hasAccount 
            ? 'Add your phone number for appointment notifications'
            : 'Enter your phone number to create your account'
          }
        </p>
      </div>
      
      <div className={`transition-all duration-500 ${
        visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number {!hasAccount && <span className="text-red-500">*</span>}
        </label>
        <input 
          type="tel" 
          placeholder="(555) 123-4567" 
          value={phoneNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent mb-8"
          required={!hasAccount}
        />
      </div>
      
      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <button 
          onClick={handleContinue}
          disabled={isCreatingPhoneUser || (!hasAccount && !phoneNumber.trim())}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium disabled:bg-gray-300"
        >
          {isCreatingPhoneUser ? 'Creating Account...' : 'Continue'}
        </button>
      )}

      {/* Skip button - only show if user has account */}
      {hasAccount && (
        <div className="mt-4 text-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 underline text-sm"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  )
}

const FreeTrialStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">We want you to try Axle AI for free.</h2>
      </div>
      
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="p-1 rounded-full mr-3" style={{ backgroundColor: "#F9F9F9" }}>
            <Check className="h-4 w-4 text-[#294a46]" />
          </div>
          <span className="text-gray-700">No payment due now</span>
        </div>
      </div>

      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <div>
          <button 
            onClick={() => {
              updateData({ freeTrial: true })
              onNext()
            }}
            className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium mb-2"
          >
            Try for free
          </button>
          <p className="text-center text-gray-500 text-sm">
            Just $49.94 per year ($4.16/mo)
          </p>
        </div>
      )}
    </div>
  )
}

const ChoosePlanStep = ({ onNext, updateData, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly')
  const [visibleItems, setVisibleItems] = useState(0)

  // Animation effect for plan options
  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setVisibleItems(i)
      }
    }
    showItems()
  }, [])

  const plans = [
    { 
      id: 'monthly', 
      name: 'Monthly', 
      price: '$8 /mo',
      features: [
        { icon: '🎯', title: 'Predictive Maintenance' },
        { icon: '💰', title: 'Cost Savings' },
        { icon: '🔧', title: 'Established Research' }
      ]
    },
    { 
      id: 'yearly', 
      name: 'Yearly', 
      price: '$4.16/mo',
      features: ['Advanced AI', 'Priority support', 'Unlimited tracking', 'Save 48%']
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600 text-sm">
          Select the plan that best fits your needs
        </p>
      </div>
      
            <div className="grid grid-cols-2 gap-4 mb-4">
        {plans.map((plan, index) => (
          <div key={plan.id} className={`relative transition-all duration-500 ${index === 0 ? '' : 'delay-100'} ${
            visibleItems >= (index + 1) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}>
            {plan.id === 'yearly' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-[#294a46] text-white text-xs font-semibold px-2 py-1 rounded-full shadow-md whitespace-nowrap">
                  3 days FREE
                </div>
              </div>
            )}
            <button
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full p-4 text-left border-2 rounded-lg transition-all group ${
                selectedPlan === plan.id 
                  ? 'border-[#294a46] bg-[#e6eeec]' 
                  : 'border-gray-200 md:hover:border-[#294a46] md:hover:bg-[#e6eeec]'
              }`}
            >
                          <div className="flex flex-col h-full">
              <div className="mb-4 text-center">
                <h3 className={`font-semibold text-lg ${
                  selectedPlan === plan.id ? 'text-[#294a46]' : 'text-gray-900 group-hover:text-[#294a46]'
                }`}>{plan.name}</h3>
              </div>
              <div className="flex-1 mb-4">
                  {plan.id === 'monthly' ? (
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => {
                        // Check if feature is a string or object
                        if (typeof feature === 'string') {
                          // Render string features simply
                          return (
                            <div key={index} className="flex items-center">
                              <span className="text-green-500 mr-2">✓</span>
                              <span className="text-sm text-gray-700">{feature}</span>
                            </div>
                          );
                        } else {
                          // Render object features with icon, title
                          return (
                            <div key={index} className="flex items-center">
                              <div className="text-lg mr-2">{feature.icon}</div>
                              <span className="text-sm font-medium text-gray-900">{feature.title}</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="p-1 rounded-full mr-3" style={{ backgroundColor: "#F9F9F9" }}>
                          <Check className="h-4 w-4 text-[#294a46]" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          <span className="hidden md:inline">Today:<br />Save 48%</span>
                          <span className="md:hidden">Today: Save 48%</span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="p-1 rounded-full mr-3" style={{ backgroundColor: "#F9F9F9" }}>
                          <Check className="h-4 w-4 text-[#294a46]" />
                        </div>
                        <span className="text-sm text-gray-600">
                          In 2 days Reminder
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="p-1 rounded-full mr-3" style={{ backgroundColor: "#F9F9F9" }}>
                          <Check className="h-4 w-4 text-[#294a46]" />
                        </div>
                        <span className="text-sm text-gray-600">
                          <span className="hidden md:inline">3rd day<br />Billed.</span>
                          <span className="md:hidden">3rd day Billed.</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-xl font-medium">{plan.price}</p>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>



      {/* Only show button if showButton is true (desktop) */}
      {showButton && (
        <div>
          <div className="text-center mb-4">
            <div className="flex items-center justify-center">
              <div className="p-1 rounded-full mr-3" style={{ backgroundColor: "#F9F9F9" }}>
                <Check className="h-4 w-4 text-[#294a46]" />
              </div>
              <span className="text-gray-700 text-sm">
                {selectedPlan === 'monthly' ? 'No Commitment - Cancel Anytime' : 'No payment due now'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              updateData({ plan: selectedPlan })
              onNext()
            }}
            className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium mb-2"
          >
            {selectedPlan === 'monthly' ? 'Start Car Health' : 'Start my 3 day free trial'}
          </button>
          <p className="text-center text-gray-500 text-sm">
            {selectedPlan === 'monthly' ? '$8 per month' : '3 days free, then $49.94 per year (~$4.16/mo)'}
          </p>
        </div>
      )}
    </div>
  )
}

const LimitedOfferStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div className="text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Limited One Time Offer</h2>
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
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Immediately complete onboarding when component mounts
  useEffect(() => {
    const completeOnboarding = async () => {
      if (!onboardingData?.userId) {
        console.log('⚠️ No user ID found in onboarding data');
        return;
      }

      try {
        console.log('🎯 SuccessStep: Immediately completing onboarding for user:', onboardingData.userId);
        console.log('🎯 Onboarding data available:', onboardingData);
        setIsCompletingOnboarding(true);
        setError(null);

        // Step 1: Check session state BEFORE API call
        console.log('🔐 Step 1: Checking session state BEFORE API call...');
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        const { data: sessionDataBefore } = await (supabase.auth as any).getSession();
        const { data: { user: userBefore } } = await (supabase.auth as any).getUser();
        
        console.log('🔐 Session state BEFORE API call:');
        console.log('🔐 - Session exists:', !!sessionDataBefore?.session);
        console.log('🔐 - User exists:', !!userBefore);
        console.log('🔐 - User ID:', userBefore?.id);
        console.log('🔐 - Session access token length:', sessionDataBefore?.session?.access_token?.length || 0);
        
        // Log cookies and localStorage state
        console.log('🍪 Cookies BEFORE API call:');
        console.log('🍪 - Document cookies:', document.cookie);
        console.log('🍪 - LocalStorage keys:', Object.keys(localStorage));
        console.log('🍪 - SessionStorage keys:', Object.keys(sessionStorage));
        
        if (!userBefore) {
          console.error('❌ No authenticated user found BEFORE API call');
          throw new Error('No authenticated user found before API call');
        }

        // Always call the API to ensure onboarding is completed
        console.log('📤 ALWAYS calling onboarding completion API from SuccessStep...');
        
        // Get user session and access token
        const accessToken = sessionDataBefore?.session?.access_token;
        const refreshToken = sessionDataBefore?.session?.refresh_token;
        
        console.log('🔐 Session data available:', !!sessionDataBefore);
        console.log('🔐 Access token available:', !!accessToken);
        console.log('🔐 Refresh token available:', !!refreshToken);
        
        // Log token details if available
        if (accessToken) {
          try {
            const tokenParts = accessToken.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log('🔐 Frontend - Token expiry:', new Date(payload.exp * 1000).toISOString());
              console.log('🔐 Frontend - Token issued at:', new Date(payload.iat * 1000).toISOString());
              console.log('🔐 Frontend - Token subject (user ID):', payload.sub);
              console.log('🔐 Frontend - Current time:', new Date().toISOString());
              console.log('🔐 Frontend - Token expired:', Date.now() > payload.exp * 1000);
            }
          } catch (e) {
            console.log('🔐 Frontend - Could not decode token payload:', e);
          }
        }
        
        // Prepare onboarding data for API call
        const apiData = {
          vehicle: onboardingData?.vehicle,
          referralSource: onboardingData?.referralSource,
          usedOtherApps: onboardingData?.usedOtherApps,
          lastService: onboardingData?.lastService,
          location: onboardingData?.location,
          notifications: onboardingData?.notifications,
          additionalVehicles: onboardingData?.additionalVehicles,
          phoneNumber: onboardingData?.phoneNumber,
          plan: onboardingData?.plan,
          freeTrial: onboardingData?.freeTrial
        };
        
        console.log('📤 API request data:', apiData);
        
        // Call API to save onboarding data and set onboarding_completed: true
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            ...(refreshToken && { 'X-Refresh-Token': refreshToken }),
          },
          body: JSON.stringify({ 
            onboardingData: apiData,
            tokens: {
              access_token: accessToken,
              refresh_token: refreshToken
            }
          }),
        });

        console.log('📤 API response status:', response.status);
        console.log('📤 API response headers:', Object.fromEntries(response.headers.entries()));
        
        // Check for Set-Cookie headers specifically
        const setCookieHeader = response.headers.get('set-cookie');
        console.log('🍪 Set-Cookie header from API:', setCookieHeader);
        
        // Log all response headers for debugging
        console.log('📤 All response headers:');
        response.headers.forEach((value, key) => {
          console.log(`📤 - ${key}: ${value}`);
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Failed to complete onboarding:', response.status, errorData);
          throw new Error(`Onboarding completion failed: ${response.status} - ${JSON.stringify(errorData)}`);
        } else {
          const responseData = await response.json();
          console.log('✅ Onboarding completed successfully from SuccessStep:', responseData);
          
          // Step 2: Check session state AFTER API call
          console.log('🔐 Step 2: Checking session state AFTER API call...');
          const { data: sessionDataAfter } = await (supabase.auth as any).getSession();
          const { data: { user: userAfter }, error: userErrorAfter } = await (supabase.auth as any).getUser();
          
          console.log('🔐 Session state AFTER API call:');
          console.log('🔐 - Session exists:', !!sessionDataAfter?.session);
          console.log('🔐 - User exists:', !!userAfter);
          console.log('🔐 - User ID:', userAfter?.id);
          console.log('🔐 - User error:', userErrorAfter);
          console.log('🔐 - Session access token length:', sessionDataAfter?.session?.access_token?.length || 0);
          
          // Log cookies and localStorage state after API call
          console.log('🍪 Cookies AFTER API call:');
          console.log('🍪 - Document cookies:', document.cookie);
          console.log('🍪 - LocalStorage keys:', Object.keys(localStorage));
          console.log('🍪 - SessionStorage keys:', Object.keys(sessionStorage));
          
          // Check for any changes in session state
          console.log('🔄 Session state comparison:');
          console.log('🔄 - Session before vs after:', !!sessionDataBefore?.session, '->', !!sessionDataAfter?.session);
          console.log('🔄 - User before vs after:', !!userBefore, '->', !!userAfter);
          console.log('🔄 - User ID before vs after:', userBefore?.id, '->', userAfter?.id);
          
          // Step 3: Handle session refresh if needed using existing utilities
          let finalUser = userAfter;
          if (!userAfter && userErrorAfter) {
            console.log('🔐 Step 3: Session appears to be invalid, attempting refresh...');
            
            try {
              // Use existing session validation utility
              const sessionResult = await validateSessionWithRetry(2, 500);
              
              if (sessionResult.success && sessionResult.user) {
                console.log('✅ Session refreshed successfully using utility');
                finalUser = sessionResult.user;
                console.log('🔐 Refreshed user ID:', finalUser?.id);
              } else {
                console.error('❌ Session refresh failed using utility:', sessionResult.error);
                throw new Error(`Session refresh failed: ${sessionResult.error}`);
              }
            } catch (refreshError) {
              console.error('❌ Error during session refresh:', refreshError);
              throw new Error('Failed to refresh session after onboarding completion');
            }
          }
          
          // Step 4: Verify the profile was updated correctly
          if (!finalUser) {
            console.error('❌ No authenticated user found for verification after all attempts');
            throw new Error('No authenticated user found after session refresh');
          }
          
          console.log('🔍 Verifying profile update for user:', finalUser.id);
          
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('onboarding_completed, auth_method, user_id')
            .eq('user_id', finalUser.id)
            .single();
            
          if (profileError) {
            console.error('❌ Error verifying profile after completion:', profileError);
            throw new Error('Failed to verify profile completion');
          } else {
            console.log('✅ Profile verification after completion:');
            console.log('✅ - onboarding_completed:', profile?.onboarding_completed);
            console.log('✅ - auth_method:', profile?.auth_method);
            console.log('✅ - user_id:', profile?.user_id);
            
            if (!profile?.onboarding_completed) {
              console.error('❌ CRITICAL: Profile still shows onboarding_completed: false after API call!');
              console.error('❌ Profile data:', profile);
              throw new Error('Profile still shows onboarding_completed: false after completion');
            }
            
            setOnboardingCompleted(true);
            console.log('✅ SUCCESS: Onboarding completion verified!');
          }
        }
      } catch (error) {
        console.error('❌ Error completing onboarding in SuccessStep:', error);
        setError(error instanceof Error ? error.message : 'Failed to complete onboarding');
      } finally {
        setIsCompletingOnboarding(false);
      }
    };

    completeOnboarding();
  }, [onboardingData?.userId]);

  const handleGoToDashboard = async () => {
    if (skippedSteps.length > 0) {
      setShowSkippedSteps(true);
      setCurrentSkippedStep(skippedSteps[0]);
      return;
    }

    // Final verification before dashboard access
    try {
      console.log('🔍 Final verification before dashboard access...');
      
      if (!onboardingData?.userId) {
        throw new Error('No user ID found');
      }

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Step 1: Check session state before dashboard access
      console.log('🔐 Step 1: Checking session state before dashboard access...');
      const { data: sessionData } = await (supabase.auth as any).getSession();
      const { data: { user }, error: userError } = await (supabase.auth as any).getUser();
      
      console.log('🔐 Session state before dashboard access:');
      console.log('🔐 - Session exists:', !!sessionData?.session);
      console.log('🔐 - User exists:', !!user);
      console.log('🔐 - User ID:', user?.id);
      console.log('🔐 - User error:', userError);
      console.log('🔐 - Session access token length:', sessionData?.session?.access_token?.length || 0);
      
      // Step 2: Handle session refresh if needed
      let finalUser = user;
      if (!user && userError) {
        console.log('🔐 Step 2: Session appears to be invalid, attempting refresh...');
        
        try {
          // Use existing session validation utility
          const sessionResult = await validateSessionWithRetry(2, 500);
          
          if (sessionResult.success && sessionResult.user) {
            console.log('✅ Session refreshed successfully using utility');
            finalUser = sessionResult.user;
            console.log('🔐 Refreshed user ID:', finalUser?.id);
          } else {
            console.error('❌ Session refresh failed using utility:', sessionResult.error);
            throw new Error(`Session refresh failed: ${sessionResult.error}`);
          }
        } catch (refreshError) {
          console.error('❌ Error during session refresh:', refreshError);
          throw new Error('Failed to refresh session before dashboard access');
        }
      }
      
      if (!finalUser) {
        console.error('❌ No authenticated user found after session refresh');
        throw new Error('User not authenticated after session refresh');
      }

      // Step 3: Verify profile exists and is completed
      console.log('🔍 Step 3: Verifying profile completion...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, auth_method, user_id')
        .eq('user_id', finalUser.id)
        .single();

      if (profileError) {
        console.error('❌ Final verification failed - profile error:', profileError);
        throw new Error('Profile verification failed');
      }

      if (!profile) {
        console.error('❌ Final verification failed - no profile found');
        throw new Error('No profile found');
      }

      if (!profile.onboarding_completed) {
        console.error('❌ Final verification failed - onboarding not completed');
        throw new Error('Onboarding not completed');
      }

      console.log('✅ Final verification successful:');
      console.log('✅ - Profile exists:', !!profile);
      console.log('✅ - onboarding_completed:', profile.onboarding_completed);
      console.log('✅ - auth_method:', profile.auth_method);
      console.log('✅ - user_id:', profile.user_id);
      console.log('✅ - Authenticated user ID:', finalUser.id);

      // Step 4: Clear localStorage and proceed
      console.log('🧹 Step 4: Clearing localStorage...');
      localStorage.removeItem('onboardingData');
      localStorage.removeItem('pendingOnboarding');

      console.log('🚀 All checks passed, proceeding to dashboard...');
      onNext();
    } catch (error) {
      console.error('❌ Final verification failed:', error);
      setError(error instanceof Error ? error.message : 'Dashboard access verification failed');
    }
  };

  const handleSkippedStepComplete = () => {
    const remainingSteps = skippedSteps.filter(step => step !== currentSkippedStep);
    if (remainingSteps.length > 0) {
      setCurrentSkippedStep(remainingSteps[0]);
    } else {
      onNext(); // Go to dashboard
    }
  };

  // If showing skipped steps, render the skipped step
  if (showSkippedSteps && currentSkippedStep) {
    const step = ONBOARDING_STEPS.find(s => s.id === currentSkippedStep);
    if (step) {
      const StepComponent = step.component;
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
      );
    }
  }

  return (
    <div className="text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
        <p className="text-gray-600">
          Welcome to Axle
        </p>
      </div>
      
      {isCompletingOnboarding && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-900">Completing your onboarding...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
          <p className="text-red-900 font-semibold mb-2">⚠️ Setup Issue</p>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {onboardingCompleted && !error && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
          <p className="text-green-900">✅ You're all set to start tracking your vehicle maintenance!</p>
        </div>
      )}

      {/* Only show button if showButton is true (desktop) and onboarding is completed */}
      {showButton && onboardingCompleted && !error && (
        <button 
          onClick={handleGoToDashboard}
          disabled={isCompletingOnboarding}
          className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium disabled:bg-gray-300"
        >
          Go to Dashboard
        </button>
      )}

      {showButton && !onboardingCompleted && !error && !isCompletingOnboarding && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
          <p className="text-yellow-900">Please wait while we complete your setup...</p>
        </div>
      )}
    </div>
  );
};

const DashboardRedirect = ({ onboardingData, setCurrentStep, trackCompletion }: { onboardingData: OnboardingData; setCurrentStep?: (step: number) => void; trackCompletion?: () => Promise<void> }) => {
  const router = useRouter()

  useEffect(() => {
    const completeOnboarding = async () => {
      try {
        console.log('🔄 Completing onboarding and preparing for dashboard...');
        
        // Check if user has either email-based account OR phone-based account
        const hasAccount = onboardingData?.userId || false
        
        if (!hasAccount) {
          // No account created - this shouldn't happen with new logic
          alert('Please create an account to save your information')
          if (setCurrentStep) {
            setCurrentStep(14) // Go back to account creation
          }
          return
        }

        // Validate session before proceeding
        if (!supabase) {
          console.error('❌ Supabase client not initialized');
          throw new Error('Database connection error');
        }

        // Use the new session validation utility
        const sessionResult = await validateSessionForNavigation();
        
        if (sessionResult.success) {
          console.log('✅ Valid session confirmed for navigation:', sessionResult.user?.id);
        } else {
          console.warn('⚠️ Session validation result:', sessionResult.error);
          // Try to wait for session establishment
          console.log('⏳ Attempting to wait for session establishment...');
          const establishmentResult = await waitForSessionEstablishment();
          
          if (establishmentResult.success) {
            console.log('✅ Session established successfully:', establishmentResult.user?.id);
          } else {
            console.warn('⚠️ Session establishment failed, proceeding anyway:', establishmentResult.error);
          }
        }

        // Get pending onboarding data from localStorage
        const pendingData = localStorage.getItem('pendingOnboarding')
        if (pendingData) {
          const data = JSON.parse(pendingData)
          
          console.log('📤 Calling onboarding completion API with data:', data);
          
          // Get user session and access token
          const { data: sessionData } = await (supabase.auth as any).getSession();
          const accessToken = sessionData?.session?.access_token;
          const refreshToken = sessionData?.session?.refresh_token;
          
          console.log('🔐 DashboardRedirect - Session data available:', !!sessionData);
          console.log('🔐 DashboardRedirect - Access token available:', !!accessToken);
          console.log('🔐 DashboardRedirect - Refresh token available:', !!refreshToken);
          
          // Call API to save onboarding data
          const response = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
              ...(refreshToken && { 'X-Refresh-Token': refreshToken }),
            },
            body: JSON.stringify({ 
              onboardingData: data,
              tokens: {
                access_token: accessToken,
                refresh_token: refreshToken
              }
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Failed to save onboarding data:', response.status, errorData);
            throw new Error(`Onboarding completion failed: ${response.status}`);
          } else {
            const responseData = await response.json();
            console.log('✅ Onboarding data saved successfully');
            console.log('✅ API Response:', responseData);
            
            // Verify the profile was updated correctly
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (user) {
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('onboarding_completed, auth_method, user_id')
                .eq('user_id', user.id)
                .single();
                
              if (profileError) {
                console.error('❌ Error verifying profile update:', profileError);
              } else {
                console.log('✅ Profile verification - onboarding_completed:', profile?.onboarding_completed);
                console.log('✅ Profile verification - auth_method:', profile?.auth_method);
                console.log('✅ Profile verification - user_id:', profile?.user_id);
                if (!profile?.onboarding_completed) {
                  console.warn('⚠️ Profile still shows onboarding_completed: false, but proceeding...');
                } else {
                  console.log('✅ SUCCESS: Profile verified with onboarding_completed: true');
                }
              }
            } else {
              console.log('🔐 No user found after API call, attempting session refresh...');
              
              try {
                // Use existing session validation utility
                const sessionResult = await validateSessionWithRetry(2, 500);
                
                if (sessionResult.success && sessionResult.user) {
                  console.log('✅ Session refreshed successfully after API call');
                  console.log('✅ User found after session refresh:', sessionResult.user.id);
                  
                  // Verify profile with refreshed user
                  const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('onboarding_completed, auth_method, user_id')
                    .eq('user_id', sessionResult.user.id)
                    .single();
                    
                  if (profileError) {
                    console.error('❌ Error verifying profile after refresh:', profileError);
                  } else {
                    console.log('✅ Profile verification after refresh - onboarding_completed:', profile?.onboarding_completed);
                    console.log('✅ Profile verification after refresh - auth_method:', profile?.auth_method);
                    console.log('✅ Profile verification after refresh - user_id:', profile?.user_id);
                  }
                } else {
                  console.error('❌ Session refresh failed after API call:', sessionResult.error);
                }
              } catch (refreshError) {
                console.error('❌ Error during session refresh after API call:', refreshError);
              }
            }
          }
        } else {
          console.log('ℹ️ No pending onboarding data found in localStorage');
        }

        // Clear localStorage
        localStorage.removeItem('onboardingData')
        localStorage.removeItem('pendingOnboarding')
        
        // Track completion before redirect
        if (trackCompletion) {
          await trackCompletion()
        }
        
        // Add a small delay to ensure session is properly established
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay
        
        console.log('🚀 Redirecting to customer dashboard...');
        // Redirect to customer dashboard
        router.push('/customer-dashboard')
      } catch (error) {
        console.error('❌ Error completing onboarding:', error)
        // Still redirect to dashboard - let it handle any auth issues
        router.push('/customer-dashboard')
      }
    }

    completeOnboarding()
  }, [router, onboardingData?.userId, setCurrentStep])

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Setting up your account...</h2>
        <p className="text-gray-600">Please wait while we prepare your dashboard...</p>
      </div>
    </div>
  )
}

// Wrapper component for DashboardRedirect
const DashboardRedirectWrapper = ({ onboardingData }: { onboardingData: OnboardingData }) => {
  const [currentStepState, setCurrentStepState] = useState(1)
  
  // Get trackCompletion from the parent component context
  const { trackCompletion } = useOnboardingTracking({
    type: 'customer',
    currentStep: 20,
    totalSteps: 19,
    userId: onboardingData?.userId ?? undefined
  })
  
  return (
    <DashboardRedirect 
      onboardingData={onboardingData} 
      setCurrentStep={setCurrentStepState}
      trackCompletion={trackCompletion}
    />
  )
}

// Helper function to create user with onboarding data
const createUserWithOnboardingData = async (userId: string, onboardingData: OnboardingData) => {
  try {
    console.log('👤 Creating/updating user profile with onboarding data for user:', userId);
    
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      throw new Error('Database connection error')
    }
    
    // First get the user's auth data
    const { data: { user }, error: authError } = await (supabase.auth as any).getUser();

    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      throw new Error('User not authenticated')
    }

    // 1. Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, email, phone, full_name, onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('❌ Profile check error:', profileCheckError);
      if (profileCheckError.code === '406' || profileCheckError.code === '401') {
        console.warn('⚠️ RLS/Authentication issue detected. Check user permissions and RLS policies.');
        // Try to fetch with different approach
        const { data: retryProfile, error: retryError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (retryError) {
          console.error('❌ Retry failed:', retryError);
          throw new Error('Profile access denied. Please contact support.');
        }
        
        if (retryProfile) {
          console.log('✅ Found existing profile via retry:', retryProfile.id);
          // Continue with existing profile
        }
      } else if (profileCheckError.code === '409' || profileCheckError.code === '400') {
        console.warn('⚠️ 409/400 error - profile may already exist, continuing...');
        // Continue with profile creation/update
      } else {
        throw profileCheckError;
      }
    }

    let profileExists = !!existingProfile;
    console.log('📋 Profile exists check:', profileExists);

    // 2. Prepare profile data
    const profileData = {
      id: user.id,
      user_id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      phone: onboardingData?.phoneNumber,
      address: onboardingData?.location,
      city: onboardingData?.location?.split(',')[0]?.trim(),
      state: onboardingData?.location?.split(',')[1]?.trim(),
      zip_code: onboardingData?.location?.split(',')[2]?.trim(),
      vehicles: [onboardingData?.vehicle, ...(onboardingData?.additionalVehicles || [])],
      referral_source: onboardingData?.referralSource,
      last_service: onboardingData?.lastService,
      notifications_enabled: onboardingData?.notifications,
      communication_preferences: { notifications: onboardingData?.notifications },
      notification_settings: { enabled: onboardingData?.notifications },
      onboarding_completed: true,
      onboarding_type: 'full',
      profile_completed_at: new Date().toISOString(),
      onboarding_data: onboardingData,
      subscription_plan: onboardingData?.plan,
      subscription_status: onboardingData?.freeTrial ? 'trial' : 'inactive',
      free_trial_ends_at: onboardingData?.freeTrial ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    let profileOperationResult;

    if (profileExists) {
      console.log('📝 Updating existing profile...');
      console.log('📋 Profile update data:', JSON.stringify(profileData, null, 2));
      console.log('🔍 User ID:', user.id);
      console.log('🔍 Auth session valid:', !!user);
      
      // 3. Update existing profile
      profileOperationResult = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id) // Use user_id instead of id for RLS compliance
        .select('id')
        .single();
    } else {
      console.log('📝 Creating new profile...');
      console.log('📋 Profile insert data:', JSON.stringify({
        ...profileData,
        user_id: user.id, // Ensure user_id matches auth.uid()
        created_at: new Date().toISOString()
      }, null, 2));
      console.log('🔍 User ID:', user.id);
      console.log('🔍 Auth session valid:', !!user);
      
      // 3. Create new profile
      profileOperationResult = await supabase
        .from('user_profiles')
        .insert({
          ...profileData,
          user_id: user.id, // Ensure user_id matches auth.uid()
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
    }

    // 4. Handle 409 errors by fetching existing profile
    if (profileOperationResult.error) {
      console.error('❌ Profile operation error:', profileOperationResult.error);
      console.error('📋 Error details:', JSON.stringify(profileOperationResult.error, null, 2));
      
      if (profileOperationResult.error.code === '409') {
        console.log('🔄 409 error - profile already exists, fetching existing profile...');
        
        // Fetch the existing profile
        const { data: fetchedProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('id, onboarding_completed')
          .eq('user_id', user.id) // Use user_id instead of id
          .single();

        if (fetchError) {
          console.error('❌ Failed to fetch existing profile:', fetchError);
          console.error('📋 Fetch error details:', JSON.stringify(fetchError, null, 2));
          throw new Error('Profile conflict. Please try again.');
        }

        console.log('✅ Successfully fetched existing profile:', fetchedProfile.id);
        
        // Try update again on the existing profile
        const { error: retryUpdateError } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id); // Use user_id instead of id

        if (retryUpdateError) {
          console.error('❌ Retry update failed:', retryUpdateError);
          console.error('📋 Retry error details:', JSON.stringify(retryUpdateError, null, 2));
          throw new Error('Failed to update profile. Please try again.');
        }
        
        console.log('✅ Retry update succeeded');
      } else if (profileOperationResult.error.code === '406') {
        console.warn('⚠️ 406 error - RLS policy issue, trying alternative approach...');
        console.error('🔍 Auth user ID:', user.id);
        console.error('🔍 Auth session valid:', !!user);
        
        // Try with different headers or approach
        const { data: altProfile, error: altError } = await supabase
          .from('user_profiles')
          .upsert({
            ...profileData,
            user_id: user.id // Ensure user_id matches auth.uid()
          }, { 
            onConflict: 'user_id', // Use user_id as conflict key
            ignoreDuplicates: false 
          })
          .select('id')
          .single();

        if (altError) {
          console.error('❌ Alternative approach failed:', altError);
          console.error('📋 Alternative error details:', JSON.stringify(altError, null, 2));
          throw new Error('Profile access denied. Please contact support.');
        }

        console.log('✅ Alternative approach succeeded:', altProfile.id);
      } else if (profileOperationResult.error.code === '403') {
        console.error('❌ 403 Forbidden - RLS policy violation');
        console.error('🔍 Auth user ID:', user.id);
        console.error('🔍 Auth session valid:', !!user);
        console.error('📋 Full error details:', JSON.stringify(profileOperationResult.error, null, 2));
        
        // Try to re-authenticate and retry
        const { data: { user: reauthUser }, error: reauthError } = await (supabase.auth as any).getUser();
        if (reauthError || !reauthUser) {
          console.error('❌ Re-authentication failed:', reauthError);
          throw new Error('Authentication required. Please log in again.');
        }
        
        console.log('🔄 Re-authenticated user:', reauthUser.id);
        
        // Retry with re-authenticated user
        const { data: retryProfile, error: retryError } = await supabase
          .from('user_profiles')
          .upsert({
            ...profileData,
            user_id: reauthUser.id
          }, { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          })
          .select('id')
          .single();

        if (retryError) {
          console.error('❌ Retry after re-auth failed:', retryError);
          throw new Error('Profile access denied. Please contact support.');
        }

        console.log('✅ Retry after re-auth succeeded:', retryProfile.id);
      } else {
        console.error('❌ Unknown error code:', profileOperationResult.error.code);
        console.error('📋 Full error details:', JSON.stringify(profileOperationResult.error, null, 2));
        throw profileOperationResult.error;
      }
    } else {
      console.log('✅ Profile operation succeeded:', profileOperationResult.data?.id);
    }

    console.log('🎉 Customer profile creation/update completed successfully!');
    console.log('👤 User ID:', user.id);
    console.log('📅 Completion time:', new Date().toISOString());
    
  } catch (error) {
    console.error('❌ Error creating user with onboarding data:', error);
    throw error;
  }
}

// Main onboarding component
const ONBOARDING_STEPS = [
  { id: 1, title: "Vehicle Information", component: VehicleInfoStep },
  { id: 2, title: "How did you find us?", component: ReferralSourceStep },
  { id: 3, title: "Previous Apps", component: PreviousAppsStep },
  { id: 4, title: "Why Axle is Better", component: WhyAxleStep },
  { id: 5, title: "Last Service", component: LastServiceStep },
  { id: 6, title: "Thank you for trusting us", component: ThankYouStep },
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
  
  // Get step from URL or default to 1
  const urlStep = searchParams.get('step')
  const [currentStep, setCurrentStep] = useState(urlStep ? parseInt(urlStep) : 1)
  const [skippedSteps, setSkippedSteps] = useState<number[]>([])
  const [carAnimating, setCarAnimating] = useState(false)
  const [user, setUser] = useState<any>(null)
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

  // Update URL when step changes
  useEffect(() => {
    const newUrl = `/onboarding/customer/flow?step=${currentStep}`
    window.history.pushState({}, '', newUrl)
  }, [currentStep])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const urlStep = new URLSearchParams(window.location.search).get('step')
      if (urlStep) {
        setCurrentStep(parseInt(urlStep))
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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

  // Load saved data from session storage on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('onboardingData')
    if (savedData) {
      setOnboardingData(JSON.parse(savedData))
    }
  }, [])

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentStep])

  // Get user auth state with proper error handling
  // Note: Unauthenticated users are expected and supported in the onboarding flow
  // They will use localStorage for tracking until they create an account
  useEffect(() => {
    const getUser = async () => {
      try {
        if (!supabase) {
          console.error('❌ Supabase client not initialized')
          return
        }
        
        const { data: { user }, error } = await (supabase.auth as any).getUser()
        
        if (error) {
          // Handle AuthSessionMissingError gracefully for unauthenticated users
          if (error?.name === 'AuthSessionMissingError') {
            console.log('ℹ️ No authenticated session - using localStorage for tracking')
          } else {
            console.error('❌ Error getting user:', error)
          }
          // Don't return here - set user to null to indicate unauthenticated state
          setUser(null)
          return
        }
        
        setUser(user)
        console.log('✅ User auth state updated:', user?.id ? 'Authenticated' : 'Not authenticated')
        
        // Update onboarding data with user ID if authenticated
        if (user?.id) {
          setOnboardingData(prev => ({ ...prev, userId: user.id }))
        }
      } catch (error) {
        console.error('❌ Error in getUser:', error)
        setUser(null)
      }
    }
    getUser()
  }, [])

  // Initialize onboarding tracking (works for both authenticated and unauthenticated users)
  const { trackCompletion } = useOnboardingTracking({
    type: 'customer',
    currentStep,
    totalSteps: 19,
    userId: user?.id || undefined
  })

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
    const newDataComplete = { ...onboardingData, ...newData }
    setOnboardingData(newDataComplete)
    
    // Save to session storage
    sessionStorage.setItem('onboardingData', JSON.stringify(newDataComplete))
  }

  const handleNext = () => {
    const nextStep = currentStep + 1
    if (nextStep <= 20) {
      setCurrentStep(nextStep)
      router.push(`/onboarding/customer/flow?step=${nextStep}`)
    }
  }

  const handleBack = () => {
    console.log('Back button clicked, current step:', currentStep);
    const prevStep = currentStep - 1;
    if (currentStep === 1) {
      // Navigate to welcome page on step 1
      console.log('Navigating to welcome page');
      router.push('/welcome')
    } else if (prevStep >= 1) {
      console.log('Going back to step:', prevStep);
      setCurrentStep(prevStep);
      router.push(`/onboarding/customer/flow?step=${prevStep}`);
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
      
      <div className={`container mx-auto px-4 ${currentStep === 14 ? 'py-4 max-w-md' : 'py-4 max-w-md'}`}>
        {/* Progress Bar */}
        <div className={`${currentStep === 14 ? "mb-4" : "mb-4"} relative z-40`}>
          <div className={`${currentStep === 14 ? 'max-w-md' : 'max-w-md'} mx-auto`}>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                console.log('Button clicked!');
                e.preventDefault();
                handleBack();
              }}
              className="flex items-center px-3 py-2 rounded-lg transition-colors text-[#294a46] hover:bg-gray-100 relative z-50"
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
                <span className="text-2xl" style={{ transform: 'rotateY(180deg)' }}>🏎️</span>
              </div>
              {/* Finish flag at the end */}
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2">
                <span className="text-lg">🏁</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Axle Logo for step 14 on desktop */}
        {currentStep === 14 && (
          <div className="hidden md:flex items-center justify-center py-6">
            <Image
              src="/images/axle-logo-green.png"
              alt="Axle Logo"
              width={120}
              height={48}
              className="h-10 w-auto"
            />
          </div>
        )}

        {/* Main Card - Desktop: normal styling for step 14, Mobile: no white background */}
        {currentStep === 14 ? (
          <div className="md:bg-white md:rounded-lg md:shadow-xl md:border-0 md:p-8">
            {/* Step content with buttons */}
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
