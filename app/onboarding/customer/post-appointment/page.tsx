'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { CustomerSignupForm } from '@/components/customer-signup-form';
import { SiteHeader } from '@/components/site-header';
import Footer from '@/components/footer';

// Type definitions
type Vehicle = {
  year: string;
  make: string;
  model: string;
  vin?: string;
  mileage?: string;
  licensePlate?: string;
};

type PostAppointmentData = {
  // Pre-filled from appointment
  phone?: string;
  address?: string;
  vehicle?: Vehicle;
  appointmentId?: string;
  
  // To be collected
  email: string;
  password: string;
  fullName: string;
  preferences: any;
  notifications: any;
  serviceHistory: any;
  insurance: any;
  emergencyContact: any;
};

// Step Components
const CreateAccountStep = ({ onNext, updateData, onboardingData }: any) => {
  return (
    <div className="-mt-8 md:-mt-32">
      <CustomerSignupForm 
        isOnboarding={true}
        onboardingData={onboardingData}
        onSuccess={(userId: string) => {
          if (userId === 'skipped') {
            onNext();
          } else {
            updateData({ userId });
            onNext();
          }
        }}
      />
    </div>
  );
};

const PersonalInfoStep = ({ onNext, onBack, updateData, onboardingData, preFilledPhone }: any) => {
  const [fullName, setFullName] = useState(onboardingData.fullName || '');
  const [phone, setPhone] = useState(preFilledPhone || onboardingData.phone || '');
  const [errors, setErrors] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrors({ fullName: 'Name is required' });
      return;
    }
    
    updateData({ fullName, phone });
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Personal Information
      </h2>
      <p className="text-gray-600 mb-6">
        We just need your name to complete your profile
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            disabled
          />
          <p className="mt-1 text-xs text-gray-500">
            Phone number from your appointment booking
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

const WelcomeBenefitsStep = ({ onNext, onBack }: any) => {
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    const showItems = async () => {
      for (let i = 1; i <= 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setVisibleItems(i);
      }
    };
    showItems();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome to Axle!
      </h2>
      
      <div className="mb-8 space-y-4">
        <div className={`flex items-start transition-all duration-500 ${
          visibleItems >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-gray-700">Track all your service history</span>
        </div>

        <div className={`flex items-start transition-all duration-500 delay-100 ${
          visibleItems >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-gray-700">Get maintenance reminders</span>
        </div>

        <div className={`flex items-start transition-all duration-500 delay-200 ${
          visibleItems >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
          <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-gray-700">Save money with preventive care</span>
        </div>
      </div>

      <p className={`text-gray-600 mb-8 transition-all duration-500 ${
        visibleItems >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        Over 80% of our users have avoided major repairs
      </p>

      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const VehicleVerificationStep = ({ onNext, onBack, updateData, onboardingData, preFilledVehicle }: any) => {
  const vehicle = preFilledVehicle || onboardingData.vehicle || {};
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Verify Your Vehicle
      </h2>
      <p className="text-gray-600 mb-6">
        Confirm this is the vehicle from your appointment
      </p>

      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-600">Vehicle:</span>
            <p className="font-semibold text-gray-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
          </div>
          
          {vehicle.vin && (
            <div>
              <span className="text-sm text-gray-600">VIN:</span>
              <p className="font-mono text-gray-900">{vehicle.vin}</p>
            </div>
          )}
          
          {vehicle.mileage && (
            <div>
              <span className="text-sm text-gray-600">Current Mileage:</span>
              <p className="text-gray-900">{vehicle.mileage} miles</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Yes, This is Correct
        </button>
      </div>
    </div>
  );
};

const VehicleDetailsStep = ({ onNext, onBack, updateData, onboardingData }: any) => {
  const [vehicle, setVehicle] = useState(onboardingData.vehicle || {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Vehicle Details Confirmation</h2>
      <p className="text-gray-600 mb-6">
        Please confirm your vehicle information is correct
      </p>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN (Optional)</label>
            <input
              type="text"
              value={vehicle.vin || ''}
              onChange={(e) => setVehicle({...vehicle, vin: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="1HGBH41JXMN109186"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
            <input
              type="text"
              value={vehicle.licensePlate || ''}
              onChange={(e) => setVehicle({...vehicle, licensePlate: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ABC123"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            updateData({ vehicle });
            onNext();
          }}
          className="flex-1 bg-[#294a46] text-white py-2 px-4 rounded-lg hover:bg-[#1e3632]"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const ServicePreferencesStep = ({ onNext, onBack, updateData, onboardingData }: any) => {
  const [preferences, setPreferences] = useState({
    preferredDay: onboardingData.preferences?.preferredDay || '',
    preferredTime: onboardingData.preferences?.preferredTime || '',
    serviceReminders: onboardingData.preferences?.serviceReminders ?? true,
    promotions: onboardingData.preferences?.promotions ?? true
  });

  const handleSubmit = () => {
    updateData({ preferences });
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Service Preferences
      </h2>
      <p className="text-gray-600 mb-6">
        Help us serve you better
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Day for Service
          </label>
          <select
            value={preferences.preferredDay}
            onChange={(e) => setPreferences({...preferences, preferredDay: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No preference</option>
            <option value="weekday">Weekdays</option>
            <option value="weekend">Weekends</option>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Time
          </label>
          <select
            value={preferences.preferredTime}
            onChange={(e) => setPreferences({...preferences, preferredTime: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No preference</option>
            <option value="morning">Morning (8AM-12PM)</option>
            <option value="afternoon">Afternoon (12PM-5PM)</option>
            <option value="evening">Evening (5PM-8PM)</option>
          </select>
        </div>

        <div className="space-y-3 pt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.serviceReminders}
              onChange={(e) => setPreferences({...preferences, serviceReminders: e.target.checked})}
              className="mr-3"
            />
            <span className="text-sm">Send me service reminders</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.promotions}
              onChange={(e) => setPreferences({...preferences, promotions: e.target.checked})}
              className="mr-3"
            />
            <span className="text-sm">Notify me about special offers</span>
          </label>
        </div>
      </div>

      <div className="flex space-x-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const CommunicationPreferencesStep = ({ onNext, onBack, updateData, onboardingData }: any) => {
  const [communication, setCommunication] = useState(onboardingData.communication || {});

  const options = [
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'sms', label: 'Text Messages', icon: '📱' },
    { key: 'push', label: 'Push Notifications', icon: '🔔' }
  ];

  const toggleOption = (key: string) => {
    setCommunication(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Communication Preferences</h2>
      <p className="text-gray-600 mb-6">
        How would you like to receive updates about your vehicle?
      </p>
      
      <div className="space-y-3 mb-6">
        {options.map(option => (
          <button
            key={option.key}
            onClick={() => toggleOption(option.key)}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              communication[option.key]
                ? 'border-[#294a46] bg-[#e6eeec]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
              </div>
              {communication[option.key] && (
                <span className="text-[#294a46]">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            updateData({ communication });
            onNext();
          }}
          className="flex-1 bg-[#294a46] text-white py-2 px-4 rounded-lg hover:bg-[#1e3632]"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const NotificationSettingsStep = ({ onNext, onBack, updateData, onboardingData }: any) => {
  const [notifications, setNotifications] = useState(onboardingData.notifications || {});

  const notificationTypes = [
    'Appointment reminders',
    'Service due alerts',
    'Mechanic updates',
    'Special offers',
    'Maintenance tips'
  ];

  const toggleNotification = (type: string) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
      <p className="text-gray-600 mb-6">
        Choose what notifications you'd like to receive
      </p>
      
      <div className="space-y-3 mb-6">
        {notificationTypes.map(type => (
          <button
            key={type}
            onClick={() => toggleNotification(type)}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              notifications[type]
                ? 'border-[#294a46] bg-[#e6eeec]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{type}</span>
              {notifications[type] && (
                <span className="text-[#294a46]">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            updateData({ notifications });
            onNext();
          }}
          className="flex-1 bg-[#294a46] text-white py-2 px-4 rounded-lg hover:bg-[#1e3632]"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const ServiceHistoryStep = ({ onNext, onBack, updateData, onboardingData }: any) => {
  const [serviceHistory, setServiceHistory] = useState(onboardingData.serviceHistory || {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Service History</h2>
      <p className="text-gray-600 mb-6">
        Tell us about your recent vehicle services
      </p>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
          <input
            type="date"
            value={serviceHistory.lastServiceDate || ''}
            onChange={(e) => setServiceHistory({...serviceHistory, lastServiceDate: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
          <input
            type="text"
            value={serviceHistory.lastServiceType || ''}
            onChange={(e) => setServiceHistory({...serviceHistory, lastServiceType: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Oil change, brake service, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mileage at Last Service</label>
          <input
            type="number"
            value={serviceHistory.lastServiceMileage || ''}
            onChange={(e) => setServiceHistory({...serviceHistory, lastServiceMileage: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="45000"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            updateData({ serviceHistory });
            onNext();
          }}
          className="flex-1 bg-[#294a46] text-white py-2 px-4 rounded-lg hover:bg-[#1e3632]"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const AIHealthPreviewStep = ({ onNext, onBack }: any) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Health Preview 🤖</h2>
      <p className="text-gray-600 mb-6">
        Get a sneak peek at what our AI can do for your vehicle
      </p>
      
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your AI Assistant will:</h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <span className="text-blue-600">🔍</span>
            <span>Analyze your vehicle's health patterns</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-blue-600">📅</span>
            <span>Predict when you'll need maintenance</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-blue-600">💰</span>
            <span>Help you save money on repairs</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-blue-600">📊</span>
            <span>Track your vehicle's performance</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-[#294a46] text-white py-2 px-4 rounded-lg hover:bg-[#1e3632]"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const InsuranceInfoStep = ({ onNext, onBack, updateData, onboardingData }: any) => {
  const [insurance, setInsurance] = useState(onboardingData.insurance || {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Insurance Information (Optional)</h2>
      <p className="text-gray-600 mb-6">
        This helps us provide better service recommendations
      </p>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
          <input
            type="text"
            value={insurance.provider || ''}
            onChange={(e) => setInsurance({...insurance, provider: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="State Farm, Geico, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
          <input
            type="text"
            value={insurance.policyNumber || ''}
            onChange={(e) => setInsurance({...insurance, policyNumber: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            updateData({ insurance });
            onNext();
          }}
          className="flex-1 bg-[#294a46] text-white py-2 px-4 rounded-lg hover:bg-[#1e3632]"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const EmergencyContactStep = ({ onNext, onBack, updateData, onboardingData }: any) => {
  const [emergencyContact, setEmergencyContact] = useState({
    name: onboardingData.emergencyContact?.name || '',
    phone: onboardingData.emergencyContact?.phone || '',
    relationship: onboardingData.emergencyContact?.relationship || ''
  });

  const handleSubmit = () => {
    updateData({ emergencyContact });
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Emergency Contact
      </h2>
      <p className="text-gray-600 mb-6">
        Who should we contact in case of emergency?
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Name
          </label>
          <input
            type="text"
            value={emergencyContact.name}
            onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={emergencyContact.phone}
            onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relationship
          </label>
          <select
            value={emergencyContact.relationship}
            onChange={(e) => setEmergencyContact({...emergencyContact, relationship: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select relationship</option>
            <option value="spouse">Spouse</option>
            <option value="parent">Parent</option>
            <option value="sibling">Sibling</option>
            <option value="friend">Friend</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="flex space-x-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const TermsAcceptanceStep = ({ onNext, onBack }: any) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Terms & Conditions
      </h2>
      <p className="text-gray-600 mb-6">
        Please review and accept our terms
      </p>

      <div className="bg-gray-50 rounded-lg p-4 mb-6 h-48 overflow-y-auto text-sm text-gray-600">
        <h3 className="font-semibold text-gray-900 mb-2">Terms of Service</h3>
        <p className="mb-3">
          By using Axle's services, you agree to these terms...
        </p>
        
        <h3 className="font-semibold text-gray-900 mb-2">Privacy Policy</h3>
        <p className="mb-3">
          We respect your privacy and protect your personal information...
        </p>
        
        <h3 className="font-semibold text-gray-900 mb-2">Service Agreement</h3>
        <p>
          Our mechanics are independent contractors...
        </p>
      </div>

      <label className="flex items-start mb-6">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 mr-3"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the Terms of Service, Privacy Policy, 
          and Service Agreement
        </span>
      </label>

      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!accepted}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300"
        >
          Accept & Continue
        </button>
      </div>
    </div>
  );
};

const FinalWelcomeStep = ({ onNext, onBack, userName, isLastStep }: any) => {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🎉</div>
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to Axle, {userName}!
      </h2>
      
      <p className="text-lg text-gray-600 mb-8">
        Your account is all set up. You can now track your appointment, 
        manage your vehicles, and keep your car healthy.
      </p>

      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
        <ul className="text-left space-y-2 text-gray-700">
          <li>• Check your email for appointment confirmation</li>
          <li>• View your upcoming appointment in the dashboard</li>
          <li>• Set up service reminders for your vehicle</li>
          <li>• Explore money-saving maintenance tips</li>
        </ul>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default function PostAppointmentOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  
  const [currentStep, setCurrentStep] = useState(2); // Start at step 2
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<PostAppointmentData>({
    email: '',
    password: '',
    fullName: '',
    preferences: {},
    notifications: {},
    serviceHistory: {},
    insurance: {},
    emergencyContact: {}
  });

  // Define which steps to show (shortened flow)
  const STEPS_TO_SHOW = [2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 16, 17, 18, 19];
  const currentStepIndex = STEPS_TO_SHOW.indexOf(currentStep);

  useEffect(() => {
    loadAppointmentData();
  }, []);

  const loadAppointmentData = async () => {
    try {
      const appointmentId = searchParams.get('appointmentId');
      if (!appointmentId) {
        console.error('No appointment ID provided');
        router.push('/');
        return;
      }

      // Load appointment data to pre-fill form
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error || !appointment) {
        console.error('Failed to load appointment data');
        router.push('/');
        return;
      }

      // Pre-fill data from appointment
      setOnboardingData(prev => ({
        ...prev,
        appointmentId,
        phone: appointment.phone,
        address: appointment.address,
        vehicle: {
          year: appointment.vehicle_year,
          make: appointment.vehicle_make,
          model: appointment.vehicle_model,
          vin: appointment.vehicle_vin,
          mileage: appointment.vehicle_mileage
        }
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error loading appointment:', error);
      router.push('/');
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS_TO_SHOW.length) {
      setCurrentStep(STEPS_TO_SHOW[nextIndex]);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS_TO_SHOW[prevIndex]);
    }
  };

  const updateData = (data: Partial<PostAppointmentData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  const completeOnboarding = async () => {
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: onboardingData.email,
        password: onboardingData.password,
        options: {
          data: {
            full_name: onboardingData.fullName,
            phone: onboardingData.phone,
            onboarding_type: 'post-appointment'
          }
        }
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user!.id,
          full_name: onboardingData.fullName,
          phone: onboardingData.phone,
          email: onboardingData.email,
          onboarding_completed: true,
          created_via: 'post-appointment'
        });

      if (profileError) throw profileError;

      // Save vehicle
      if (onboardingData.vehicle) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .insert({
            user_id: authData.user!.id,
            ...onboardingData.vehicle
          });
        
        if (vehicleError) throw vehicleError;
      }

      // Link appointment to new user
      if (onboardingData.appointmentId) {
        await supabase
          .from('appointments')
          .update({ customer_id: authData.user!.id })
          .eq('id', onboardingData.appointmentId);
      }

      // Save other preferences
      await saveUserPreferences(authData.user!.id);

      // Redirect to dashboard
      router.push('/customer-dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to create account. Please try again.');
    }
  };

  const saveUserPreferences = async (userId: string) => {
    // Save all the additional data collected during onboarding
    const promises = [];

    // Save emergency contact
    if (onboardingData.emergencyContact?.name) {
      promises.push(
        supabase.from('emergency_contacts').insert({
          user_id: userId,
          ...onboardingData.emergencyContact
        })
      );
    }

    // Save insurance info
    if (onboardingData.insurance?.provider) {
      promises.push(
        supabase.from('insurance_info').insert({
          user_id: userId,
          ...onboardingData.insurance
        })
      );
    }

    // Save preferences
    if (onboardingData.preferences || onboardingData.notifications) {
      promises.push(
        supabase.from('user_preferences').insert({
          user_id: userId,
          service_preferences: onboardingData.preferences,
          notification_settings: onboardingData.notifications
        })
      );
    }

    await Promise.all(promises);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={handleBack}
              className="flex items-center px-3 py-2 rounded-lg transition-colors text-[#294a46] hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Complete Your Account
            </h1>
            <span className="text-sm text-gray-600">
              Step {currentStepIndex + 1} of {STEPS_TO_SHOW.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / STEPS_TO_SHOW.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Render Current Step */}
        <div className="bg-white rounded-lg shadow p-6">
          {currentStep === 2 && (
            <CreateAccountStep
              onNext={handleNext}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 3 && (
            <PersonalInfoStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
              preFilledPhone={onboardingData.phone}
            />
          )}
          
          {currentStep === 4 && (
            <WelcomeBenefitsStep
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 6 && (
            <VehicleVerificationStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
              preFilledVehicle={onboardingData.vehicle}
            />
          )}
          
          {currentStep === 7 && (
            <VehicleDetailsStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 9 && (
            <ServicePreferencesStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 10 && (
            <CommunicationPreferencesStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 11 && (
            <NotificationSettingsStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 12 && (
            <ServiceHistoryStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 13 && (
            <AIHealthPreviewStep
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 16 && (
            <InsuranceInfoStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 17 && (
            <EmergencyContactStep
              onNext={handleNext}
              onBack={handleBack}
              updateData={updateData}
              onboardingData={onboardingData}
            />
          )}
          
          {currentStep === 18 && (
            <TermsAcceptanceStep
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 19 && (
            <FinalWelcomeStep
              onNext={handleNext}
              onBack={handleBack}
              userName={onboardingData.fullName}
              isLastStep={true}
            />
          )}
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Creating an account will allow you to manage your appointments, 
          track service history, and receive personalized recommendations.
        </p>
      </div>
      
      <Footer />
    </div>
  );
} 