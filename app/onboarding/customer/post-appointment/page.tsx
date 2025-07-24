'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, Check } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { GoogleSignInButton } from '@/components/google-signin-button'
import { CustomerSignupForm } from '@/components/customer-signup-form'
import { SiteHeader } from '@/components/site-header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { useOnboardingTracking } from '@/hooks/useOnboardingTracking'
import { validateSession, getSessionErrorMessage } from '@/lib/session-utils'
import { mergeTemporaryUserData } from '@/lib/simplified-profile-creation'

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

interface PostAppointmentOnboardingData extends OnboardingData {
  appointmentId: string | null;
  phone: string | null;
}

type StepProps = {
  onNext: () => void;
  updateData: (data: Partial<OnboardingData>) => void;
  onboardingData?: OnboardingData;
  setSkippedSteps?: React.Dispatch<React.SetStateAction<number[]>>;
};

// Car makes and models data (copied from original)
const CAR_MAKES = [
  "Acura", "Alfa Romeo", "Alpine", "Aston Martin", "Audi", "Bentley", "BMW", "Bugatti", "Buick", "Cadillac", 
  "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Fisker", "Ford", "Genesis", "GMC", "Honda", "Hummer", 
  "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Koenigsegg", "Lamborghini", "Land Rover", "Lexus", "Lincoln", 
  "Lotus", "Lucid", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "Mercury", "Mini", "Mitsubishi", "Nissan", 
  "Oldsmobile", "Pagani", "Plymouth", "Polestar", "Pontiac", "Porsche", "Ram", "Rivian", "Rolls-Royce", "Saturn", 
  "Scion", "Smart", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
]

const CAR_MODELS: Record<string, string[]> = {
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

// Step Components - Copy from original onboarding
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
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Where'd you hear us?</h2>
        <p className="text-sm text-gray-600">Select all that apply</p>
      </div>

      <div className="flex-1 -mx-4 px-4 mb-6">
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

const WhyAxleIsBetterStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [visibleItems, setVisibleItems] = useState(0)

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
      
      <div className="space-y-6 mb-8">
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

      <div className="text-center py-4 border-t border-gray-100">
        <p className="text-sm text-gray-500">Over 80% of our users have avoided major issues</p>
      </div>

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
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={lastService.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastService({...lastService, date: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent appearance-none bg-white"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            </div>
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

const AxleAIBenefitsStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  const [visibleItems, setVisibleItems] = useState(0)

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
    
    updateData({ notifications: true });

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
      <div className="mb-6">
        <div className="w-20 h-20 bg-[#294a46] rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
        We Like to Send You Notifications
      </h2>
      
      <p className="text-base text-gray-600 text-center mb-8 max-w-sm">
        Notifications may include predictive maintenance services, order receipts, mechanics quotes and eta, and more!
      </p>

      <div className="w-full max-w-xs grid grid-cols-2 gap-3">
        <button
          onClick={handleDontAllow}
          className="py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Don't Allow
        </button>
        
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
          
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <span className="text-2xl">👆</span>
      </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center mt-12 max-w-xs">
        You can change this anytime in your device settings
      </p>
    </div>
  );
};

const AddAnotherCarStep = ({ onNext, updateData, onboardingData, showButton = true }: StepProps & { showButton?: boolean }) => {
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

  const currentYear = new Date().getFullYear();
  const allYears = Array.from({length: 80}, (_, i) => (currentYear - i).toString());
  
  const filteredYears = allYears.filter(year => year.includes(newVehicle.year));
  
  const filteredMakes = CAR_MAKES.filter(make => 
    make.toLowerCase().includes(newVehicle.make.toLowerCase())
  );
  
  const availableModels = newVehicle.make ? (CAR_MODELS[newVehicle.make] || GENERIC_MODELS) : [];
  const filteredModels = availableModels.filter(model => 
    model.toLowerCase().includes(newVehicle.model.toLowerCase())
  );

  const handleAddVehicle = () => {
    if (newVehicle.year && newVehicle.make && newVehicle.model) {
      const updatedVehicles = [...(onboardingData?.additionalVehicles || []), newVehicle];
      updateData({ additionalVehicles: updatedVehicles });
      
      setNewVehicle({
        year: '',
        make: '',
        model: '',
        vin: '',
        mileage: '',
        licensePlate: ''
      });
      setShowAddForm(false);
      
      alert(`Vehicle ${updatedVehicles.length + 1} added successfully!`);
    }
  };

  const totalVehicles = 1 + (onboardingData?.additionalVehicles?.length || 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Another Car</h2>
        <p className="text-gray-600 text-sm">
          Do you have additional cars you'd like to track?
        </p>
      </div>

      <div className="mb-6 space-y-3">
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

      {showAddForm && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Add Vehicle {totalVehicles + 1}
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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
                    setNewVehicle({...newVehicle, make: value, model: ''})
                  }}
                  onFocus={() => setShowMakeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowMakeDropdown(false), 200)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
                
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

const MaintenanceScheduleStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
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
          <div key={plan.id} className="relative">
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
                        if (typeof feature === 'string') {
                          return (
                            <div key={index} className="flex items-center">
                              <span className="text-green-500 mr-2">✓</span>
                              <span className="text-sm text-gray-700">{feature}</span>
                            </div>
                          );
                        } else {
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
                          <span className="hidden md:inline">3rd day Billed.</span>
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

const SuccessStep = ({ onNext, showButton = true }: StepProps & { showButton?: boolean }) => {
  return (
    <div className="text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
        <p className="text-gray-600">
          Welcome to Axle
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

export default function PostAppointmentOnboarding() {
  // Define only the steps we want for post-appointment
  const POST_APPOINTMENT_STEPS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19];
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [currentStep, setCurrentStep] = useState(2); // Start at step 2 (Referral Source)
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Map step index to original step number
  const getOriginalStepNumber = (index: number) => {
    return POST_APPOINTMENT_STEPS[index];
  };
  
  // Get current step index for tracking
  const currentStepIndex = POST_APPOINTMENT_STEPS.indexOf(currentStep);
  
  // Initialize onboarding tracking
  const { trackCompletion } = useOnboardingTracking({
    type: 'post_appointment',
    currentStep: currentStepIndex + 1, // Convert 0-based to 1-based
    originalStepNumber: getOriginalStepNumber(currentStepIndex),
    totalSteps: POST_APPOINTMENT_STEPS.length,
    userId: user?.id ?? undefined,
    appointmentId: searchParams.get('appointmentId') ?? undefined
  });

  const [formData, setFormData] = useState<PostAppointmentOnboardingData>({
    // Pre-fill from appointment
    appointmentId: searchParams.get('appointmentId'),
    phone: searchParams.get('phone'),
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
    phoneNumber: searchParams.get('phone') || '',
    plan: null,
    freeTrial: false
  });

  // 1. Check authentication and session on mount
  useEffect(() => {
    const checkAuthAndSession = async () => {
      try {
        console.log('🔐 Checking authentication and session...');
        
        // Use the robust session validation utility
        const sessionResult = await validateSession();
        
        if (!sessionResult.success) {
          console.error('❌ Session validation failed:', sessionResult.error);
          await supabase.auth.signOut();
          const errorMessage = getSessionErrorMessage(sessionResult.errorCode || 'UNKNOWN');
          setAuthError(errorMessage);
          router.push('/login');
          return;
        }

        console.log('✅ Valid session and user found:', sessionResult.user?.id);
        setUser(sessionResult.user);
        setFormData(prev => ({ ...prev, userId: sessionResult.user?.id }));
        
        // Check if user already has a completed profile
        console.log('🔍 Checking if user has completed profile...');
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('user_profiles')
          .select('onboarding_completed, onboarding_type')
          .eq('user_id', sessionResult.user?.id)
          .single();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error('❌ Error checking existing profile:', profileCheckError);
          // Continue with onboarding as fallback
        }

        if (existingProfile) {
          console.log('📋 Existing profile found:', {
            onboarding_completed: existingProfile.onboarding_completed,
            onboarding_type: existingProfile.onboarding_type
          });
          
          // Check if user has completed onboarding
          if (existingProfile.onboarding_completed) {
            console.log('✅ User has completed onboarding, redirecting to dashboard');
            router.push('/customer-dashboard');
            return;
          } else {
            console.log('⏳ User has incomplete onboarding, continuing with post-appointment flow');
          }
        } else {
          console.log('📝 No existing profile found, continuing with post-appointment flow');
        }
        
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        await supabase.auth.signOut();
        setAuthError('Authentication failed. Please log in again.');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndSession();
  }, [supabase.auth, router]);

  // Load appointment data and pre-fill vehicle info
  useEffect(() => {
    if (!user?.id) return; // Don't load data without valid user

    const loadAppointmentData = async () => {
      try {
        const appointmentId = searchParams.get('appointmentId');
        const phone = searchParams.get('phone');

        if (!appointmentId) {
          console.log('ℹ️ No appointment ID provided - user may have come from account creation');
          // Don't show error, just continue without appointment data
          return;
        }

        console.log('📋 Loading appointment data for ID:', appointmentId);

        const { data: appointment, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (error) {
          console.error('❌ Error loading appointment:', error);
          if (error.code === '406' || error.code === '409' || error.code === '400') {
            setAuthError('Appointment not found or access denied. Please check your link.');
          } else {
            setAuthError('Failed to load appointment data. Please try again.');
          }
          return;
        }

        if (appointment) {
          console.log('✅ Appointment data loaded successfully');
          // Pre-fill data we already have
          setFormData((prev: PostAppointmentOnboardingData) => ({
            ...prev,
            // Vehicle info from appointment (for Add Another Car step)
            vehicle: {
              year: appointment.vehicle_year,
              make: appointment.vehicle_make,
              model: appointment.vehicle_model,
              vin: appointment.vehicle_vin || '',
              mileage: appointment.vehicle_mileage || '',
              licensePlate: '',
            },
            phoneNumber: phone || appointment.phone,
            // Location data if available
            location: appointment.address || null,
          }));
        }
      } catch (error) {
        console.error('❌ Error in loadAppointmentData:', error);
        setAuthError('Failed to load appointment data. Please try again.');
      }
    };

    loadAppointmentData();
  }, [user?.id, searchParams, supabase]);

  const handleNext = () => {
    const currentIndex = POST_APPOINTMENT_STEPS.indexOf(currentStep);
    if (currentIndex < POST_APPOINTMENT_STEPS.length - 1) {
      setCurrentStep(POST_APPOINTMENT_STEPS[currentIndex + 1]);
    } else if (currentStep === 19) {
      // After Success step, complete onboarding
      completeOnboarding();
    }
  };

  const handleBack = () => {
    const currentIndex = POST_APPOINTMENT_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(POST_APPOINTMENT_STEPS[currentIndex - 1]);
    }
  };

  const completeOnboarding = async () => {
    try {
      console.log('🚀 Starting onboarding completion...');
      
      // 1. Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        setAuthError('Session error. Please try again.');
        return;
      }

      if (!session) {
        console.error('❌ No valid session for onboarding completion');
        setAuthError('No valid session. Please log in again.');
        router.push('/login');
        return;
      }

      // 2. Get current user from session
      const currentUser = session.user;
      
      if (!currentUser || !currentUser.id) {
        console.error('❌ No valid user for onboarding completion');
        setAuthError('No valid user. Please log in again.');
        router.push('/login');
        return;
      }

      console.log('✅ User validated for onboarding completion:', currentUser.id);
      console.log('✅ Session valid:', !!session);

      // Step 1: Merge any remaining temporary user data
      if (formData.phone) {
        console.log('🔄 Checking for temporary user data to merge...');
        const mergeResult = await mergeTemporaryUserData(
          currentUser.id,
          formData.phone,
          formData.appointmentId || undefined
        );
        if (mergeResult.success && mergeResult.mergedAppointments && mergeResult.mergedAppointments > 0) {
          console.log(`✅ Merged ${mergeResult.mergedAppointments} additional appointments during onboarding`);
        }
      }

      // Update user_profiles instead of users
      console.log('📝 Updating user profile...');
      
      // 1. Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('user_profiles')
        .select('id, onboarding_completed, onboarding_type')
        .eq('id', currentUser.id)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('❌ Profile check error:', profileCheckError);
        if (profileCheckError.code === '406') {
          console.warn('⚠️ 406 error - checking RLS policies and headers');
          // Try to fetch with different approach
          const { data: retryProfile, error: retryError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle();
          
          if (retryError) {
            console.error('❌ Retry failed:', retryError);
            setAuthError('Profile access denied. Please contact support.');
            return;
          }
          
          if (retryProfile) {
            console.log('✅ Found existing profile via retry:', retryProfile.id);
            // Continue with existing profile
          }
        } else if (profileCheckError.code === '409' || profileCheckError.code === '400') {
          console.warn('⚠️ 409/400 error - profile may already exist, continuing...');
          // Continue with profile update
        } else {
          setAuthError('Failed to check profile. Please try again.');
          return;
        }
      }

      let profileExists = !!existingProfile;
      console.log('📋 Profile exists check:', profileExists);

      // 2. Prepare profile update data
      const profileUpdateData = {
        onboarding_completed: true,
        onboarding_type: 'post_appointment',
        profile_completed_at: new Date().toISOString(),
        address: formData.location,
        city: formData.location?.split(',')[0]?.trim(),
        state: formData.location?.split(',')[1]?.trim(),
        zip_code: formData.location?.split(',')[2]?.trim(),
        communication_preferences: { notifications: formData.notifications },
        notification_settings: { enabled: formData.notifications },
        vehicles: [formData.vehicle, ...formData.additionalVehicles],
        referral_source: formData.referralSource,
        last_service: formData.lastService,
        notifications_enabled: formData.notifications,
        onboarding_data: formData,
        updated_at: new Date().toISOString()
      };

      let profileOperationResult;

      if (profileExists) {
        console.log('📝 Updating existing profile...');
        console.log('📋 Profile update data:', JSON.stringify(profileUpdateData, null, 2));
        console.log('🔍 Current user ID:', currentUser.id);
        console.log('🔍 Auth session valid:', !!currentUser);
        
        // 3. Update existing profile
        profileOperationResult = await supabase
          .from('user_profiles')
          .update(profileUpdateData)
          .eq('user_id', currentUser.id) // Use user_id instead of id for RLS compliance
          .select('id')
          .single();
      } else {
        console.log('📝 Creating new profile (should not happen in post-appointment flow)...');
        console.log('📋 Profile insert data:', JSON.stringify({
          user_id: currentUser.id,
          email: currentUser.email || '',
          ...profileUpdateData,
          created_at: new Date().toISOString()
        }, null, 2));
        console.log('🔍 Current user ID:', currentUser.id);
        console.log('🔍 Auth session valid:', !!currentUser);
        
        // 3. Create new profile if somehow missing
        profileOperationResult = await supabase
          .from('user_profiles')
          .insert({
            user_id: currentUser.id, // Use user_id instead of id for RLS compliance
            email: currentUser.email || '',
            ...profileUpdateData,
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
            .eq('user_id', currentUser.id) // Use user_id instead of id
            .single();

          if (fetchError) {
            console.error('❌ Failed to fetch existing profile:', fetchError);
            console.error('📋 Fetch error details:', JSON.stringify(fetchError, null, 2));
            setAuthError('Profile conflict. Please try again.');
            return;
          }

          console.log('✅ Successfully fetched existing profile:', fetchedProfile.id);
          
          // Try update again on the existing profile
          const { error: retryUpdateError } = await supabase
            .from('user_profiles')
            .update(profileUpdateData)
            .eq('user_id', currentUser.id); // Use user_id instead of id

          if (retryUpdateError) {
            console.error('❌ Retry update failed:', retryUpdateError);
            console.error('📋 Retry error details:', JSON.stringify(retryUpdateError, null, 2));
            setAuthError('Failed to update profile. Please try again.');
            return;
          }
          
          console.log('✅ Retry update succeeded');
        } else if (profileOperationResult.error.code === '406') {
          console.warn('⚠️ 406 error - RLS policy issue, trying alternative approach...');
          console.error('🔍 Auth user ID:', currentUser.id);
          console.error('🔍 Auth session valid:', !!currentUser);
          
          // Try with different headers or approach
          const { data: altProfile, error: altError } = await supabase
            .from('user_profiles')
            .upsert({
              user_id: currentUser.id, // Use user_id instead of id for RLS compliance
              email: currentUser.email || '',
              ...profileUpdateData
            }, { 
              onConflict: 'user_id', // Use user_id as conflict key
              ignoreDuplicates: false 
            })
            .select('id')
            .single();

          if (altError) {
            console.error('❌ Alternative approach failed:', altError);
            console.error('📋 Alternative error details:', JSON.stringify(altError, null, 2));
            setAuthError('Profile access denied. Please contact support.');
            return;
          }

          console.log('✅ Alternative approach succeeded:', altProfile.id);
        } else if (profileOperationResult.error.code === '403') {
          console.error('❌ 403 Forbidden - RLS policy violation');
          console.error('🔍 Auth user ID:', currentUser.id);
          console.error('🔍 Auth session valid:', !!currentUser);
          console.error('📋 Full error details:', JSON.stringify(profileOperationResult.error, null, 2));
          
          // Try to get current session and retry
          const { data: { session: reauthSession }, error: reauthError } = await supabase.auth.getSession();
          if (reauthError || !reauthSession || !reauthSession.user) {
            console.error('❌ Re-authentication failed:', reauthError);
            setAuthError('Authentication required. Please log in again.');
            return;
          }
          
          const reauthUser = reauthSession.user;
          
          console.log('🔄 Re-authenticated user:', reauthUser.id);
          
          // Retry with re-authenticated user
          const { data: retryProfile, error: retryError } = await supabase
            .from('user_profiles')
            .upsert({
              user_id: reauthUser.id,
              email: reauthUser.email || '',
              ...profileUpdateData
            }, { 
              onConflict: 'user_id',
              ignoreDuplicates: false 
            })
            .select('id')
            .single();

          if (retryError) {
            console.error('❌ Retry after re-auth failed:', retryError);
            setAuthError('Profile access denied. Please contact support.');
            return;
          }

          console.log('✅ Retry after re-auth succeeded:', retryProfile.id);
        } else {
          console.error('❌ Unknown error code:', profileOperationResult.error.code);
          console.error('📋 Full error details:', JSON.stringify(profileOperationResult.error, null, 2));
          setAuthError('Failed to save profile data. Please try again.');
          return;
        }
      } else {
        console.log('✅ Profile operation succeeded:', profileOperationResult.data?.id);
      }

      console.log('✅ User profile updated successfully');
        
      // Link appointment to user
      if (formData.appointmentId) {
        console.log('🔗 Linking appointment to user...');
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ user_id: currentUser.id })
          .eq('id', formData.appointmentId);

        if (appointmentError) {
          console.error('❌ Appointment linking error:', appointmentError);
          if (appointmentError.code === '406' || appointmentError.code === '409' || appointmentError.code === '400') {
            console.warn('⚠️ Appointment linking failed but continuing...');
          } else {
            setAuthError('Failed to link appointment. Please try again.');
            return;
          }
        } else {
          console.log('✅ Appointment linked successfully');
        }
      }
      
      // Track completion before redirect
      console.log('📊 Tracking onboarding completion...');
      await trackCompletion();
      
      // 6. Add logging after onboarding completion
      console.log('🎉 Onboarding completed successfully!');
      console.log('👤 User ID:', currentUser.id);
      console.log('📅 Completion time:', new Date().toISOString());
      console.log('🔗 Redirecting to dashboard...');
      
      // Final session validation before redirect
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (!finalSession || !finalSession.user || !finalSession.user.id) {
        console.error('❌ Final session validation failed');
        setAuthError('Final validation failed. Please log in again.');
        router.push('/login');
        return;
      }

      console.log('✅ Final session validation passed, redirecting to dashboard');
      console.log('👤 Final user ID:', finalSession.user.id);
      router.push('/customer-dashboard');
      
    } catch (error) {
      console.error('❌ Onboarding completion error:', error);
      setAuthError('Onboarding completion failed. Please try again.');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294a46] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  // Show auth error
  if (authError) {
    return (
      <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <p className="text-red-800 mb-4">{authError}</p>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full bg-[#294a46] text-white hover:bg-[#1e3632]"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress for the progress bar
  const progress = ((currentStepIndex + 1) / POST_APPOINTMENT_STEPS.length) * 100;
  const displayStepNumber = currentStepIndex + 1;
  const totalSteps = POST_APPOINTMENT_STEPS.length;

  // Add updateData function (copied from original onboarding)
  const updateData = (data: Partial<PostAppointmentOnboardingData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Copy ALL the same props and handlers from original onboarding
  const stepProps = {
    formData,
    setFormData,
    updateData,
    onNext: handleNext,
    onBack: handleBack,
    currentStep,
    // ... all other props from original
  };

    return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Use the same SiteHeader as the rest of the site */}
      <SiteHeader />
      
      {/* Progress bar below the header */}
      <div className="fixed top-16 left-0 right-0 bg-white z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                handleBack();
              }}
              disabled={currentStep === 2}
              className="flex items-center px-3 py-2 rounded-lg transition-colors text-[#294a46] hover:bg-gray-100 relative z-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
              <div 
                className="bg-[#294a46] h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
              {/* Race car emoji that moves with progress */}
              <div 
                className="absolute top-0 transform -translate-y-1/2 transition-all duration-300"
                style={{ left: `calc(${progress}% - 16px)` }}
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
      
      {/* Main content - adjusted for new header height */}
      <div className="pt-16 md:pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          {/* Render only the steps we want, using the EXACT SAME components */}
          {currentStep === 2 && <ReferralSourceStep {...stepProps} />}
          {currentStep === 3 && <PreviousAppsStep {...stepProps} />}
          {currentStep === 4 && <WhyAxleIsBetterStep {...stepProps} />}
          {currentStep === 5 && <LastServiceStep {...stepProps} />}
          {currentStep === 6 && <ThankYouStep {...stepProps} />}
          {currentStep === 8 && <AxleAIBenefitsStep {...stepProps} />}
          {currentStep === 9 && <NotificationsStep {...stepProps} />}
          {currentStep === 10 && <AddAnotherCarStep {...stepProps} />}
          {currentStep === 11 && <MaintenanceScheduleStep {...stepProps} />}
          {currentStep === 12 && <SettingUpStep {...stepProps} />}
          {currentStep === 13 && <PlanReadyStep {...stepProps} />}
          {currentStep === 16 && <FreeTrialStep {...stepProps} />}
          {currentStep === 17 && <ChoosePlanStep {...stepProps} />}
          {currentStep === 18 && <LimitedOfferStep {...stepProps} />}
          {currentStep === 19 && <SuccessStep {...stepProps} />}
        </div>
      </div>
      <Footer />
    </div>
  );
}
