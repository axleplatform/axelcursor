"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { GoogleSignInButton } from "@/components/google-signin-button"
import { redirectToCorrectDashboard } from "@/lib/auth-helpers"

export default function LoginPage() {
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [inputType, setInputType] = useState<'email' | 'phone' | null>(null)
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Vehicle fields for phone auth
  const [vehicleInfo, setVehicleInfo] = useState({
    year: '',
    make: '',
    model: ''
  })

  // Detect if input is phone or email
  useEffect(() => {
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (inputValue.length > 5) {
      if (phoneRegex.test(inputValue) && inputValue.replace(/\D/g, '').length >= 10) {
        setInputType('phone');
      } else if (emailRegex.test(inputValue)) {
        setInputType('email');
      } else {
        setInputType(null);
      }
    } else {
      setInputType(null);
    }
  }, [inputValue]);

  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const handlePhoneLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizePhone(inputValue);
      
      // Search for appointments with phone + vehicle combo
      const { data: appointments, error: searchError } = await supabase
        .from('appointments')
        .select('*, profiles(*)')
        .eq('phone_number', normalizedPhone)
        .eq('vehicle_year', vehicleInfo.year)
        .eq('vehicle_make', vehicleInfo.make.toLowerCase())
        .eq('vehicle_model', vehicleInfo.model.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;

      if (appointments && appointments.length > 0) {
        const appointment = appointments[0];
        
        // Check if user has an account using profile_status
        const { data: user } = await supabase
          .from('users')
          .select('profile_status')
          .eq('phone', normalizedPhone)
          .single();

        if (user?.profile_status === 'customer') {
          // Has customer account - prompt for email/password login
          setError('You have an account. Please login with email and password.');
        } else if (user?.profile_status === 'mechanic') {
          // Has mechanic account - prompt for email/password login
          setError('You have a mechanic account. Please login with email and password.');
        } else {
          // No account or guest user - redirect to post-appointment onboarding
          router.push(`/onboarding/customer/post-appointment?appointmentId=${appointment.id}&phone=${normalizedPhone}`);
        }
      } else {
        setError('No appointments found with this phone number and vehicle. Please check your information.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (inputType === 'phone') {
        if (!vehicleInfo.year || !vehicleInfo.make || !vehicleInfo.model) {
          setError('Please enter your vehicle information');
          return;
        }
        await handlePhoneLogin();
        return;
      }

      if (!inputValue || !password) {
        throw new Error("Please enter both email and password")
      }

      const { data, error: signInError } = await (supabase.auth as any).signInWithPassword({
        email: inputValue.trim(),
        password: password,
      })

      if (signInError) {
        // Provide more helpful error messages
        if (signInError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please check your credentials.')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account.')
        } else {
          setError(signInError.message)
        }
        return
      }

      if (!data.user) {
        throw new Error("Login failed - no user data received")
      }
      
      // Add a small delay to ensure session is established
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force refresh the session
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      
      if (session) {
        // Use the redirectToCorrectDashboard function
        await redirectToCorrectDashboard(router)
      } else {
        setError("Login successful but session not established. Please try again.")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmationEmail = async (): Promise<void> => {
    if (!inputValue || inputType !== 'email') {
      setError("Please enter your email address first")
      return
    }

    setIsResendingEmail(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: inputValue.trim(),
      })

      if (error) {
        throw error
      }

      setError("")
      setResendSuccess(true)
    } catch (error: unknown) {
      console.error("❌ Error:", error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend confirmation email'
      setError(errorMessage)
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">

          {/* Axle Logo */}
          <div className="text-center">
            <Image
              src="/images/axle-logo-green.png"
              alt="Axle Logo"
              width={120}
              height={40}
              className="mx-auto mb-6"
            />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#294a46]">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{" "}
              <Link
                href="/signup"
                className="text-[#294a46] font-medium transition-transform hover:scale-105 active:scale-95"
              >
                Sign up
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
              <p>{error}</p>
              {error.includes("email has not been confirmed") && (
                <button
                  onClick={handleResendConfirmationEmail}
                  disabled={isResendingEmail}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 focus:outline-none underline"
                >
                  {isResendingEmail ? "Sending..." : "Resend confirmation email"}
                </button>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md" role="alert">
              <p>Confirmation email has been sent! Please check your inbox and spam folder.</p>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="input" className="block text-lg font-medium text-gray-900 mb-1 tracking-tight">
                Email or Phone Number
              </label>
              <input
                id="input"
                name="input"
                type="text"
                autoComplete="email"
                required
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="block w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#294a46] sm:text-sm sm:leading-6"
                placeholder="Enter your email or phone number"
              />
              {inputType && (
                <p className="mt-1 text-xs text-gray-500">
                  Detected: {inputType === 'email' ? 'Email address' : 'Phone number'}
                </p>
              )}
            </div>

            {/* Conditional Fields Based on Input Type */}
            {inputType === 'phone' && (
              <>
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>Returning customer?</strong> Enter your vehicle info to access your account
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={vehicleInfo.year}
                      onChange={(e) => setVehicleInfo({...vehicleInfo, year: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                      placeholder="2020"
                      maxLength={4}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Make
                    </label>
                    <input
                      type="text"
                      value={vehicleInfo.make}
                      onChange={(e) => setVehicleInfo({...vehicleInfo, make: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                      placeholder="Honda"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={vehicleInfo.model}
                      onChange={(e) => setVehicleInfo({...vehicleInfo, model: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                      placeholder="Civic"
                      required
                    />
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  Enter the vehicle you used for your recent appointment
                </p>
              </>
            )}

            {inputType === 'email' && (
              <div>
                <label htmlFor="password" className="block text-lg font-medium text-gray-900 mb-1 tracking-tight">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border-0 py-3 px-4 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#294a46] sm:text-sm sm:leading-6"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? '🙈' : '👀'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#294a46] focus:ring-[#294a46]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="text-[#294a46] font-medium hover:text-[#1a2f2c] transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-md bg-[#294a46] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1a2f2c] focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <GoogleSignInButton userType="customer">
              Sign in with Google
            </GoogleSignInButton>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
