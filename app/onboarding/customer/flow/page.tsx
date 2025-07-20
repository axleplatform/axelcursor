"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GoogleSignInButton } from '@/components/google-signin-button'

// Step Components
const VehicleInfoStep = ({ onNext, updateData }) => {
  const [vehicle, setVehicle] = useState({
    year: '',
    make: '',
    model: '',
    vin: '',
    mileage: '',
    licensePlate: ''
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🚗 Input your vehicle information</h2>
      
      <div className="space-y-4">
        <input 
          type="number" 
          placeholder="Year" 
          value={vehicle.year}
          onChange={(e) => setVehicle({...vehicle, year: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="text" 
          placeholder="Make" 
          value={vehicle.make}
          onChange={(e) => setVehicle({...vehicle, make: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="text" 
          placeholder="Model" 
          value={vehicle.model}
          onChange={(e) => setVehicle({...vehicle, model: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="text" 
          placeholder="VIN" 
          value={vehicle.vin}
          onChange={(e) => setVehicle({...vehicle, vin: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="number" 
          placeholder="Mileage" 
          value={vehicle.mileage}
          onChange={(e) => setVehicle({...vehicle, mileage: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="text" 
          placeholder="License Plate (Optional)" 
          value={vehicle.licensePlate}
          onChange={(e) => setVehicle({...vehicle, licensePlate: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <button 
        onClick={() => {
          updateData({ vehicle })
          onNext()
        }}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const ReferralSourceStep = ({ onNext, updateData }) => {
  const sources = [
    'Google Search',
    'App Store',
    'Friend/Family',
    'Social Media',
    'Advertisement',
    'Other'
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🔍 Where did you hear from us?</h2>
      
      <div className="space-y-3">
        {sources.map(source => (
          <button
            key={source}
            onClick={() => {
              updateData({ referralSource: source })
              onNext()
            }}
            className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {source}
          </button>
        ))}
      </div>
    </div>
  )
}

const PreviousAppsStep = ({ onNext, updateData }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">📱 Have you used other car service apps?</h2>
      
      <div className="space-y-4">
        <button
          onClick={() => {
            updateData({ usedOtherApps: true })
            onNext()
          }}
          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Yes, I have
        </button>
        
        <button
          onClick={() => {
            updateData({ usedOtherApps: false })
            onNext()
          }}
          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
        >
          No, this is my first time
        </button>
      </div>
    </div>
  )
}

const WhyAxleStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">💡 Why Axle AI is Better</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Axle AI creates long-term results</h3>
          
          {/* Car Health Graph */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-end h-32">
              <div className="text-center">
                <div className="bg-red-500 w-16 h-24 rounded-t"></div>
                <p className="text-sm mt-2">Without Axle</p>
                <p className="text-xs text-gray-600">Higher costs</p>
              </div>
              <div className="text-center">
                <div className="bg-green-500 w-16 h-16 rounded-t"></div>
                <p className="text-sm mt-2">With Axle</p>
                <p className="text-xs text-gray-600">Lower costs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-lg font-semibold text-blue-900">
            Over 87% of people save money when tracking car health
          </p>
        </div>
      </div>

      <button 
        onClick={onNext}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const LastServiceStep = ({ onNext, updateData }) => {
  const [lastService, setLastService] = useState({
    date: '',
    type: '',
    cost: '',
    mileage: ''
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🔧 Tell us about your last service</h2>
      
      <div className="space-y-4">
        <input 
          type="date" 
          placeholder="Service Date" 
          value={lastService.date}
          onChange={(e) => setLastService({...lastService, date: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="text" 
          placeholder="Service Type (e.g., Oil Change, Brake Service)" 
          value={lastService.type}
          onChange={(e) => setLastService({...lastService, type: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="number" 
          placeholder="Cost ($)" 
          value={lastService.cost}
          onChange={(e) => setLastService({...lastService, cost: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="number" 
          placeholder="Mileage at Service" 
          value={lastService.mileage}
          onChange={(e) => setLastService({...lastService, mileage: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <button 
        onClick={() => {
          updateData({ lastService })
          onNext()
        }}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const ThankYouStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <h2 className="text-2xl font-bold mb-6">🙏 Thank You!</h2>
      <p className="text-gray-600 mb-6">We're excited to help you take better care of your vehicle.</p>
      
      <button 
        onClick={onNext}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const BenefitsStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🤖 Axle AI Benefits</h2>
      
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">🎯</div>
          <div>
            <h3 className="font-semibold">Predictive Maintenance</h3>
            <p className="text-gray-600">AI predicts when your car needs service</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💰</div>
          <div>
            <h3 className="font-semibold">Cost Savings</h3>
            <p className="text-gray-600">Save up to 40% on car maintenance</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className="text-2xl">🔧</div>
          <div>
            <h3 className="font-semibold">Expert Mechanics</h3>
            <p className="text-gray-600">Vetted professionals in your area</p>
          </div>
        </div>
      </div>

      <button 
        onClick={onNext}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const LocationStep = ({ onNext, updateData }) => {
  const [location, setLocation] = useState('')

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">📍 Where are you located?</h2>
      
      <input 
        type="text" 
        placeholder="Enter your city or zip code" 
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg mb-4"
      />
      
      <button 
        onClick={() => {
          updateData({ location })
          onNext()
        }}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const NotificationsStep = ({ onNext, updateData }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🔔 Stay Updated</h2>
      <p className="text-gray-600 mb-6">Get notified about maintenance reminders and service updates</p>
      
      <div className="space-y-4">
        <button
          onClick={() => {
            updateData({ notifications: true })
            onNext()
          }}
          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Yes, keep me updated
        </button>
        
        <button
          onClick={() => {
            updateData({ notifications: false })
            onNext()
          }}
          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

const AddVehicleStep = ({ onNext, updateData }) => {
  const [additionalVehicles, setAdditionalVehicles] = useState([])
  const [currentVehicle, setCurrentVehicle] = useState({
    year: '',
    make: '',
    model: ''
  })

  const addVehicle = () => {
    if (currentVehicle.year && currentVehicle.make && currentVehicle.model) {
      setAdditionalVehicles([...additionalVehicles, currentVehicle])
      setCurrentVehicle({ year: '', make: '', model: '' })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🚙 Add Another Vehicle</h2>
      
      <div className="space-y-4 mb-6">
        <input 
          type="number" 
          placeholder="Year" 
          value={currentVehicle.year}
          onChange={(e) => setCurrentVehicle({...currentVehicle, year: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="text" 
          placeholder="Make" 
          value={currentVehicle.make}
          onChange={(e) => setCurrentVehicle({...currentVehicle, make: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input 
          type="text" 
          placeholder="Model" 
          value={currentVehicle.model}
          onChange={(e) => setCurrentVehicle({...currentVehicle, model: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <button 
          onClick={addVehicle}
          className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
        >
          Add Vehicle
        </button>
      </div>

      {additionalVehicles.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Added Vehicles:</h3>
          {additionalVehicles.map((vehicle, index) => (
            <div key={index} className="p-2 bg-gray-100 rounded mb-2">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => {
          updateData({ additionalVehicles })
          onNext()
        }}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const MaintenanceStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">📅 Maintenance Schedule</h2>
      <p className="text-gray-600 mb-6">We'll create a personalized maintenance schedule for your vehicle</p>
      
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900">Your personalized schedule will include:</h3>
        <ul className="mt-2 text-blue-800 space-y-1">
          <li>• Oil change reminders</li>
          <li>• Tire rotation schedule</li>
          <li>• Brake inspection dates</li>
          <li>• Fluid level checks</li>
        </ul>
      </div>

      <button 
        onClick={onNext}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const SettingUpStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <h2 className="text-2xl font-bold mb-6">⚙️ Setting Up Your Account</h2>
      <p className="text-gray-600 mb-6">We're configuring your personalized experience...</p>
      
      <div className="animate-pulse">
        <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
      </div>

      <button 
        onClick={onNext}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const PlanReadyStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">✅ Your Plan is Ready!</h2>
      
      <div className="bg-green-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-900">Based on your vehicle information:</h3>
        <ul className="mt-2 text-green-800 space-y-1">
          <li>• Next oil change: 3,000 miles</li>
          <li>• Tire rotation: 6,000 miles</li>
          <li>• Brake inspection: 12,000 miles</li>
        </ul>
      </div>

      <button 
        onClick={onNext}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const CreateAccountStep = ({ onNext, updateData, onboardingData }) => {
  const handleGoogleSignIn = async () => {
    try {
      // Save current onboarding data to localStorage
      localStorage.setItem('pendingOnboarding', JSON.stringify(onboardingData))
      
      // Initiate Google OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?from=onboarding&userType=customer`,
        }
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Google sign in error:', error)
    }
  }

  const handleEmailSignUp = async (email, password) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      
      // Create user in database with onboarding data
      await createUserWithOnboardingData(authData.user.id, onboardingData)
      
      updateData({ userId: authData.user.id })
      onNext()
    } catch (error) {
      console.error('Sign up error:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🔐 Create Your Account</h2>
      <p className="text-gray-600 mb-6">Log in to save your information and get started</p>
      
      <GoogleSignInButton 
        userType="customer"
        onClick={handleGoogleSignIn}
      >
        Continue with Google
      </GoogleSignInButton>
      
      <div className="my-4 text-center text-gray-500">or</div>
      
      <EmailSignUpForm onSubmit={handleEmailSignUp} />
    </div>
  )
}

const EmailSignUpForm = ({ onSubmit }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input 
        type="email" 
        placeholder="Email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
        required
      />
      
      <input 
        type="password" 
        placeholder="Password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
        required
      />
      
      <button 
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Create Account
      </button>
    </form>
  )
}

const PhoneNumberStep = ({ onNext, updateData }) => {
  const [phoneNumber, setPhoneNumber] = useState('')

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">📞 Phone Number</h2>
      <p className="text-gray-600 mb-6">Add your phone number for appointment notifications</p>
      
      <input 
        type="tel" 
        placeholder="(555) 123-4567" 
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg mb-4"
      />
      
      <button 
        onClick={() => {
          updateData({ phoneNumber })
          onNext()
        }}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  )
}

const FreeTrialStep = ({ onNext, updateData }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">🎁 Start Your Free Trial</h2>
      <p className="text-gray-600 mb-6">Try Axle Premium free for 30 days</p>
      
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900">Free Trial Includes:</h3>
        <ul className="mt-2 text-blue-800 space-y-1">
          <li>• Unlimited maintenance tracking</li>
          <li>• Priority customer support</li>
          <li>• Advanced AI insights</li>
          <li>• No credit card required</li>
        </ul>
      </div>

      <button 
        onClick={() => {
          updateData({ freeTrial: true })
          onNext()
        }}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Start Free Trial
      </button>
    </div>
  )
}

const ChoosePlanStep = ({ onNext, updateData }) => {
  const plans = [
    { id: 'basic', name: 'Basic', price: 'Free', features: ['Basic tracking', 'Email reminders'] },
    { id: 'premium', name: 'Premium', price: '$9.99/month', features: ['Advanced AI', 'Priority support', 'Unlimited tracking'] }
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">💳 Choose Your Plan</h2>
      
      <div className="space-y-4">
        {plans.map(plan => (
          <button
            key={plan.id}
            onClick={() => {
              updateData({ plan: plan.id })
              onNext()
            }}
            className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{plan.name}</h3>
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

const LimitedOfferStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <h2 className="text-2xl font-bold mb-6">🔥 Limited Time Offer!</h2>
      <p className="text-gray-600 mb-6">Get 50% off your first 3 months of Premium</p>
      
      <div className="bg-red-50 rounded-lg p-4 mb-6">
        <p className="text-red-900 font-semibold">Offer expires in 24 hours</p>
      </div>

      <button 
        onClick={onNext}
        className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
      >
        Claim Offer
      </button>
    </div>
  )
}

const SuccessStep = ({ onNext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <h2 className="text-2xl font-bold mb-6">🎉 Welcome to Axle!</h2>
      <p className="text-gray-600 mb-6">Your account has been created successfully</p>
      
      <div className="bg-green-50 rounded-lg p-4 mb-6">
        <p className="text-green-900">You're all set to start tracking your vehicle maintenance!</p>
      </div>

      <button 
        onClick={onNext}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        Go to Dashboard
      </button>
    </div>
  )
}

const DashboardRedirect = ({ onboardingData }) => {
  const router = useRouter()

  useEffect(() => {
    const completeOnboarding = async () => {
      try {
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
  }, [router])

  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <h2 className="text-2xl font-bold mb-6">Redirecting...</h2>
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
    </div>
  )
}

// Helper function to create user with onboarding data
const createUserWithOnboardingData = async (userId, onboardingData) => {
  try {
    const { error } = await supabase.from('users').insert({
      id: userId,
      email: onboardingData.email || '',
      name: onboardingData.name || '',
      role: 'customer',
      vehicles: [onboardingData.vehicle, ...onboardingData.additionalVehicles],
      referral_source: onboardingData.referralSource,
      last_service: onboardingData.lastService,
      location: onboardingData.location,
      notifications_enabled: onboardingData.notifications,
      phone: onboardingData.phoneNumber,
      subscription_plan: onboardingData.plan,
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
  { id: 20, title: "Dashboard", component: DashboardRedirect }
]

export default function CustomerOnboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState({
    vehicle: {},
    referralSource: '',
    usedOtherApps: null,
    lastService: {},
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
    
    if (stepParam) {
      setCurrentStep(parseInt(stepParam))
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

  const updateData = (newData) => {
    setOnboardingData(prev => ({ ...prev, ...newData }))
  }

  const nextStep = () => {
    if (currentStep < 20) {
      setCurrentStep(currentStep + 1)
    }
  }

  const renderCurrentStep = () => {
    const step = ONBOARDING_STEPS.find(s => s.id === currentStep)
    if (!step) return null

    const StepComponent = step.component
    return (
      <StepComponent 
        onNext={nextStep}
        updateData={updateData}
        onboardingData={onboardingData}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of 20</span>
            <span className="text-sm text-gray-600">{Math.round((currentStep / 20) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(currentStep / 20) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {renderCurrentStep()}
      </div>
    </div>
  )
} 