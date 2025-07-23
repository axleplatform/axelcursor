'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from "@/components/site-header";
import Footer from "@/components/footer";
import { GoogleSignInButton } from "@/components/google-signin-button";

export default function SignUp() {
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<'email' | 'phone' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Vehicle fields for phone auth
  const [vehicleInfo, setVehicleInfo] = useState({
    year: '',
    make: '',
    model: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

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

  const handlePhoneAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizePhone(inputValue);
      
      // Check if phone + vehicle combination exists in appointments
      const { data: appointments, error: searchError } = await supabase
        .from('appointments')
        .select('*, vehicles(*)')
        .eq('phone_number', normalizedPhone)
        .eq('vehicles.year', vehicleInfo.year)
        .eq('vehicles.make', vehicleInfo.make.toLowerCase())
        .eq('vehicles.model', vehicleInfo.model.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;

      if (appointments && appointments.length > 0) {
        const appointment = appointments[0];
        
        // Check if user already has a full account
        if (appointment.user_id && appointment.user_id !== appointment.id) {
          setError('An account already exists with this phone number. Please sign in instead.');
          return;
        }

        // Valid match found - redirect to post-appointment onboarding
        router.push(`/onboarding/customer/post-appointment?appointmentId=${appointment.id}&phone=${normalizedPhone}`);
      } else {
        setError('No appointments found with this phone number and vehicle. Please check your information or create a new account.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: inputValue,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      // Redirect to onboarding
      router.push('/onboarding/customer/flow');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputType === 'phone') {
      if (!vehicleInfo.year || !vehicleInfo.make || !vehicleInfo.model) {
        setError('Please enter your vehicle information');
        return;
      }
      await handlePhoneAuth();
    } else if (inputType === 'email') {
      await handleEmailSignUp();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <img 
              src="/images/axle-logo-green.png" 
              alt="Axle" 
              className="h-10 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">
              Sign up with email or phone number
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone Number
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                placeholder="email@example.com or (555) 123-4567"
                required
              />
              {inputType && (
                <p className="mt-1 text-xs text-gray-500">
                  Detected: {inputType === 'email' ? 'Email address' : 'Phone number'}
                </p>
              )}
            </div>

            {/* Conditional Fields Based on Input Type */}
            {inputType === 'email' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            )}

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

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !inputType}
              className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium disabled:bg-gray-300"
            >
              {loading ? 'Processing...' : 
               inputType === 'phone' ? 'Continue with Phone' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-4">
              <GoogleSignInButton
                userType="customer"
                className="w-full"
              >
                Continue with Google
              </GoogleSignInButton>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#294a46] hover:text-[#1e3632] font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
