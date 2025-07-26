'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';

export default function CustomerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Book appointment states
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [appointmentData, setAppointmentData] = useState({
    description: '',
    date: '',
    time: '',
    carRuns: true,
    selectedIssues: [] as string[],
    recommendedServices: [] as any[]
  });

  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      console.log('🔐 Checking customer dashboard access...');
      
      // Check for valid session
      const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        await (supabase.auth as any).signOut();
        setAuthError('Session error. Please log in again.');
        router.push('/login');
        return;
      }

      if (!session) {
        console.log('❌ No valid session found');
        await (supabase.auth as any).signOut();
        setAuthError('No valid session. Please log in.');
        router.push('/login');
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await (supabase.auth as any).getUser();
      
      if (userError) {
        console.error('❌ User error:', userError);
        await (supabase.auth as any).signOut();
        setAuthError('User authentication error. Please log in again.');
        router.push('/login');
        return;
      }

      if (!user || !user.id) {
        console.error('❌ No valid user or user ID');
        await (supabase.auth as any).signOut();
        setAuthError('Invalid user. Please log in again.');
        router.push('/login');
        return;
      }

      console.log('✅ Valid session and user found:', user.id);
      setUser(user);

      // Check if user is a mechanic trying to access customer dashboard
      const { data: mechanic, error: mechanicError } = await supabase
        .from('mechanic_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (mechanicError) {
        console.error('❌ Mechanic profile check error:', mechanicError);
        if (mechanicError.code === '406' || mechanicError.code === '409' || mechanicError.code === '400') {
          console.warn('⚠️ Mechanic profile check failed but continuing...');
        } else {
          setAuthError('Profile check failed. Please try again.');
          return;
        }
      }

      if (mechanic) {
        console.log('❌ Mechanic trying to access customer dashboard, redirecting...');
        // Redirect mechanics to their dashboard
        router.push('/mechanic/dashboard');
        return;
      }
      
      console.log('✅ User validated as customer, loading dashboard data...');
      // Load customer data
      await loadDashboardData(user);
      
    } catch (error) {
      console.error('❌ Access check failed:', error);
      await (supabase.auth as any).signOut();
      setAuthError('Access check failed. Please log in again.');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (currentUser: any) => {
    try {
      console.log('📋 Loading dashboard data for user:', currentUser.id);

      // Check if user has customer account and completed profile
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('profile_status')
        .eq('id', currentUser.id)
        .single();

      if (userDataError) {
        console.error('❌ User data error:', userDataError);
        if (userDataError.code === '406' || userDataError.code === '409' || userDataError.code === '400') {
          setAuthError('User data access denied. Please contact support.');
        } else {
          setAuthError('Failed to load user data. Please try again.');
        }
        return;
      }

      if (userData?.profile_status !== 'customer') {
        console.log('❌ User is not a customer, redirecting...');
        // Not a customer account - redirect to appropriate dashboard
        if (userData?.profile_status === 'mechanic') {
          router.push('/mechanic/dashboard');
        } else {
          router.push('/onboarding/customer/flow');
        }
        return;
      }

      // Get customer profile data - FIXED: use user_id instead of id
      console.log('🔍 Fetching profile for user_id:', currentUser.id);
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id) // FIXED: Changed from 'id' to 'user_id'
        .single(); // FIXED: Added .single() to expect exactly one row

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        console.error('❌ Profile error code:', profileError.code);
        console.error('❌ Profile error message:', profileError.message);
        console.error('❌ Profile error details:', profileError.details);
        
        if (profileError.code === 'PGRST116') {
          // No profile found - this might be expected for new users
          console.log('⚠️ No profile found for user, redirecting to onboarding...');
          console.log('⚠️ User ID:', currentUser.id, 'Email:', currentUser.email);
          router.push('/onboarding/customer/flow');
          return;
        } else if (profileError.code === '406' || profileError.code === '409' || profileError.code === '400') {
          setAuthError('Profile access denied. Please contact support.');
        } else {
          setAuthError('Failed to load profile data. Please try again.');
        }
        return;
      }

      if (!profile) {
        console.log('❌ No profile returned, redirecting to onboarding...');
        console.log('❌ User ID:', currentUser.id, 'Email:', currentUser.email);
        router.push('/onboarding/customer/flow');
        return;
      }

      console.log('✅ Profile loaded successfully:', profile);
      console.log('🔍 Profile onboarding_completed value:', profile.onboarding_completed);
      console.log('🔍 Profile auth_method:', profile.auth_method);
      console.log('🔍 Profile user_id:', profile.user_id);
      console.log('🔍 Profile exists:', !!profile);

      // Check both profile existence AND onboarding completion
      if (!profile || !profile.onboarding_completed) {
        console.log('❌ Dashboard access denied - checking conditions:');
        console.log('❌ - Profile exists:', !!profile);
        console.log('❌ - Profile onboarding_completed:', profile?.onboarding_completed);
        console.log('❌ - User ID:', currentUser.id);
        console.log('❌ - Auth method:', profile?.auth_method);
        console.log('❌ Redirecting to onboarding...');
        // Redirect to complete profile
        router.push('/onboarding/customer/flow');
        return;
      }

      console.log('✅ Dashboard access granted - both conditions met:');
      console.log('✅ - Profile exists:', !!profile);
      console.log('✅ - Profile onboarding_completed:', profile.onboarding_completed);
      console.log('✅ - User ID:', currentUser.id);
      console.log('✅ - Auth method:', profile.auth_method);
      console.log('✅ Profile validated, loading customer data...');

      // Load all customer data in parallel
      const [vehiclesRes, appointmentsRes, addressesRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', currentUser.id),
        supabase.from('appointments').select('*, mechanic_profiles(business_name)').eq('user_id', currentUser.id).eq('status', 'scheduled'),
        supabase.from('addresses').select('*').eq('user_id', currentUser.id)
      ]);

      // Check for errors in parallel requests
      if (vehiclesRes.error) {
        console.error('❌ Vehicles error:', vehiclesRes.error);
      }
      if (appointmentsRes.error) {
        console.error('❌ Appointments error:', appointmentsRes.error);
      }
      if (addressesRes.error) {
        console.error('❌ Addresses error:', addressesRes.error);
      }

      setProfile(profile);
      setVehicles(vehiclesRes.data || []);
      setAppointments(appointmentsRes.data || []);
      setAddresses(addressesRes.data || []);
      
      // Set default vehicle if available
      if (vehiclesRes.data && vehiclesRes.data.length > 0) {
        setSelectedVehicle(vehiclesRes.data[0].id);
      }

      console.log('✅ Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      setAuthError('Failed to load dashboard data. Please try again.');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      
      // Reload appointments
      loadDashboardData(user);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment');
    }
  };

  const handleBookAppointment = async () => {
    // Implementation for booking appointment
    // This would call your existing booking API
    router.push('/order-service');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294a46] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
            <button 
              onClick={() => router.push('/login')}
              className="w-full bg-[#294a46] text-white py-2 px-4 rounded-lg hover:bg-[#1e3632] transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      
      <div className="min-h-screen bg-gray-50">
        {/* Page Header - Similar to Mechanic Dashboard */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {profile?.full_name || user?.email?.split('@')[0]}!
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your vehicles and appointments all in one place
              </p>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Profile Completion Section - Show if phone is missing (full_name is never collected during onboarding) */}
            {profile && !profile.phone && (
              <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-blue-900 mb-2">
                      Complete Your Profile
                    </h2>
                    <p className="text-blue-700 mb-4">
                      Add your phone number to get the most out of your experience.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          placeholder="Enter your phone number"
                          className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onChange={(e) => {
                            // Update profile state immediately for better UX
                            setProfile((prev: any) => prev ? { ...prev, phone: e.target.value } : prev);
                          }}
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('user_profiles')
                            .update({
                              phone: profile.phone || undefined,
                              updated_at: new Date().toISOString()
                            })
                            .eq('user_id', user.id);
                          
                          if (error) {
                            console.error('Error updating profile:', error);
                            alert('Failed to update profile. Please try again.');
                          } else {
                            console.log('✅ Profile updated successfully');
                            // Reload dashboard data to reflect changes
                            await loadDashboardData(user);
                          }
                        } catch (error) {
                          console.error('Error updating profile:', error);
                          alert('Failed to update profile. Please try again.');
                        }
                      }}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Save Profile
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Hide the profile completion section
                      setProfile((prev: any) => prev ? { ...prev, _hideCompletion: true } : prev);
                    }}
                    className="text-blue-600 hover:text-blue-800 ml-4"
                  >
                    ✕
                  </button>
                </div>
              </section>
            )}

            {/* Section 1: Your Vehicles */}
            <section className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Vehicles</h2>
                <button
                  onClick={() => router.push('/customer-dashboard/add-vehicle')}
                  className="text-sm text-[#294a46] hover:text-[#1e3632] font-medium"
                >
                  + Add Vehicle
                </button>
              </div>
              
              {vehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#294a46] transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        VIN: {vehicle.vin || 'Not provided'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {vehicle.mileage?.toLocaleString()} miles
                      </p>
                      <div className="mt-3 flex space-x-2">
                        <button className="text-xs text-[#294a46] hover:text-[#1e3632]">
                          Edit
                        </button>
                        <span className="text-gray-300">|</span>
                        <button className="text-xs text-red-600 hover:text-red-700">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No vehicles added yet</p>
                  <button
                    onClick={() => router.push('/customer-dashboard/add-vehicle')}
                    className="mt-2 text-[#294a46] hover:text-[#1e3632] font-medium"
                  >
                    Add your first vehicle
                  </button>
                </div>
              )}
            </section>

            {/* Section 2: Upcoming Appointments */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Upcoming Appointments
              </h2>
              
              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {appointment.service_type}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(appointment.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })} at {appointment.time}
                          </p>
                          <p className="text-sm text-gray-600">
                            {appointment.mechanics?.business_name}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            {appointment.description}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => router.push(`/reschedule/${appointment.id}`)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No upcoming appointments</p>
                </div>
              )}
            </section>

            {/* Section 3: Book Appointment */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Book New Appointment
              </h2>
              
              <div className="space-y-4">
                {/* Vehicle Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Vehicle
                  </label>
                  <select
                    value={selectedVehicle}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedVehicle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                    disabled={vehicles.length === 0}
                  >
                    {vehicles.length === 0 ? (
                      <option>No vehicles available</option>
                    ) : (
                      vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe the issue
                  </label>
                  <textarea
                    value={appointmentData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAppointmentData({...appointmentData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                    rows={3}
                    placeholder="Tell us what's wrong with your vehicle..."
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={appointmentData.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAppointmentData({...appointmentData, date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time
                    </label>
                    <select
                      value={appointmentData.time}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAppointmentData({...appointmentData, time: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                    >
                      <option value="">Select time</option>
                      <option value="8:00 AM">8:00 AM</option>
                      <option value="9:00 AM">9:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="1:00 PM">1:00 PM</option>
                      <option value="2:00 PM">2:00 PM</option>
                      <option value="3:00 PM">3:00 PM</option>
                      <option value="4:00 PM">4:00 PM</option>
                      <option value="5:00 PM">5:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Car Running Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Does your car currently run and drive?
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="carRuns"
                        checked={appointmentData.carRuns === true}
                        onChange={() => setAppointmentData({...appointmentData, carRuns: true})}
                        className="mr-2"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="carRuns"
                        checked={appointmentData.carRuns === false}
                        onChange={() => setAppointmentData({...appointmentData, carRuns: false})}
                        className="mr-2"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* Common Issues */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select any issues you're experiencing
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Oil Change', 'Brake Issues', 'Engine Light', 'Tire Problems', 'Battery Issues', 'AC/Heating'].map((issue) => (
                      <label key={issue} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={appointmentData.selectedIssues.includes(issue)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            if (e.target.checked) {
                              setAppointmentData({
                                ...appointmentData,
                                selectedIssues: [...appointmentData.selectedIssues, issue]
                              });
                            } else {
                              setAppointmentData({
                                ...appointmentData,
                                selectedIssues: appointmentData.selectedIssues.filter(i => i !== issue)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{issue}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recommended Services */}
                {appointmentData.selectedIssues.length > 0 && (
                  <div className="bg-[#e6eeec] rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Recommended Services Based on Your Selection:
                    </h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {appointmentData.selectedIssues.map((issue) => (
                        <li key={issue}>• {issue} Service - Estimated $XX-$XXX</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Book Button */}
                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedVehicle || vehicles.length === 0}
                  className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium disabled:bg-gray-300"
                >
                  {vehicles.length === 0 ? 'Add a Vehicle First' : 'Continue to Book Appointment'}
                </button>
              </div>
            </section>

            {/* Section 4: Saved Addresses */}
            <section className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Saved Addresses</h2>
                <button
                  onClick={() => router.push('/customer-dashboard/add-address')}
                  className="text-sm text-[#294a46] hover:text-[#1e3632] font-medium"
                >
                  + Add Address
                </button>
              </div>
              
              {addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="flex justify-between items-center p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {address.label || 'Home'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {address.street_address}
                        </p>
                        <p className="text-sm text-gray-600">
                          {address.city}, {address.state} {address.zip_code}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-sm text-[#294a46] hover:text-[#1e3632]">
                          Edit
                        </button>
                        <span className="text-gray-300">|</span>
                        <button className="text-sm text-red-600 hover:text-red-700">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No saved addresses yet</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
