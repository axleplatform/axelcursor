import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ensureOnboardingSession, validateSessionWithRetry } from '@/lib/session-utils';

// Simple UUID generator function
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

type OnboardingType = 'mechanic' | 'customer' | 'post_appointment';

interface TrackingProps {
  type: OnboardingType;
  currentStep: number;
  stepName?: string;
  totalSteps: number;
  userId?: string;
  appointmentId?: string;
  originalStepNumber?: number; // For post-appointment
}

// Base tracking data interface
interface BaseTrackingData {
  id?: string;
  session_id: string;
  user_id?: string;
  current_step: number;
  highest_step_reached: number;
  total_steps: number;
  user_agent: string;
  current_step_name: string;
  created_at?: string;
  last_active_at?: string;
  updated_at?: string;
}

// Post-appointment specific tracking data
interface PostAppointmentTrackingData extends BaseTrackingData {
  appointment_id?: string;
  current_step_original_number?: number;
}

// Union type for all tracking data
type TrackingData = BaseTrackingData | PostAppointmentTrackingData;

const CUSTOMER_STEP_NAMES: { [key: number]: string } = {
  1: 'Vehicle Information',
  2: 'Referral Source',
  3: 'Previous Apps',
  4: 'Why Axle is Better',
  5: 'Last Service',
  6: 'Thank you for trusting us',
  7: 'Skip', // This step is skipped
  8: 'Axle AI Benefits',
  9: 'Skip', // This step is skipped
  10: 'Location',
  11: 'Notifications',
  12: 'Add Another Car',
  13: 'Skip', // This step is skipped
  14: 'Skip', // This step is skipped
  15: 'Skip', // This step is skipped
  16: 'Maintenance Schedule',
  17: 'Setting Up',
  18: 'Plan Ready',
  19: 'Create Account'
};

const POST_APPOINTMENT_STEP_NAMES: { [key: number]: string } = {
  2: 'Referral Source',
  3: 'Previous Apps',
  4: 'Why Axle is Better',
  5: 'Last Service',
  6: 'Thank you for trusting us',
  8: 'Location',
  9: 'Notifications',
  10: 'Add Another Car',
  11: 'Maintenance Schedule',
  12: 'Setting Up',
  13: 'Plan Ready',
  16: 'Free Trial',
  17: 'Choose Plan',
  18: 'Limited One Time Offer',
  19: 'Success'
};

const MECHANIC_STEP_NAMES: { [key: number]: string } = {
  // Add mechanic step names when you have them
};

// Helper function to get step name
const getStepName = (type: OnboardingType, step: number): string => {
  switch (type) {
    case 'customer':
      return CUSTOMER_STEP_NAMES[step] || `Step ${step}`;
    case 'post_appointment':
      return POST_APPOINTMENT_STEP_NAMES[step] || `Step ${step}`;
    case 'mechanic':
      return MECHANIC_STEP_NAMES[step] || `Step ${step}`;
    default:
      return `Step ${step}`;
  }
};

export function useOnboardingTracking({
  type,
  currentStep,
  stepName,
  totalSteps,
  userId,
  appointmentId,
  originalStepNumber
}: TrackingProps) {
  if (!supabase) throw new Error("Supabase client is not initialized");
  
  const sessionIdRef = useRef<string>();
  const trackingIdRef = useRef<string>();
  const stepStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lastStepRef = useRef<number>(currentStep);

  // Initialize session tracking (localStorage for unauthenticated, database for authenticated)
  useEffect(() => {
    const initSession = async () => {
      // Get or create session ID
      const sessionKey = `${type}_onboarding_session`;
      let sessionId = sessionStorage.getItem(sessionKey);

      if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem(sessionKey, sessionId);
      }

      sessionIdRef.current = sessionId;

      const tableName = `${type}_onboarding_tracking`;

      if (userId) {
        // Authenticated user - try to use database first
        try {
          // Check if tracking record exists in database
          const { data: existing, error } = await supabase
            .from(tableName)
            .select('id')
            .eq('session_id', sessionId)
            .single();

          if (existing && !error) {
            trackingIdRef.current = existing.id;
            console.log('✅ Found existing tracking record in database');
            return;
          }

          // Create new tracking record in database
          const trackingData: TrackingData = {
            session_id: sessionId,
            user_id: userId,
            current_step: currentStep,
            highest_step_reached: currentStep,
            total_steps: totalSteps,
            user_agent: navigator.userAgent,
            current_step_name: stepName || getStepName(type, currentStep)
          };

          // Add post-appointment specific fields using type assertion
          if (type === 'post_appointment') {
            (trackingData as PostAppointmentTrackingData).appointment_id = appointmentId;
            (trackingData as PostAppointmentTrackingData).current_step_original_number = originalStepNumber || currentStep;
          }

          const { data: newTracking, error: insertError } = await supabase
            .from(tableName)
            .insert(trackingData)
            .select()
            .single();

          if (newTracking && !insertError) {
            trackingIdRef.current = newTracking.id;
            console.log('✅ Created new tracking record in database');
            return;
          }

          console.warn('⚠️ Database tracking failed, falling back to localStorage');
        } catch (error) {
          console.warn('⚠️ Database tracking error, falling back to localStorage:', error);
        }
      }

      // Fallback to localStorage (for unauthenticated users or database failures)
      const trackingKey = `${type}_onboarding_tracking`;
      const existingTracking = localStorage.getItem(trackingKey);
      
      if (existingTracking) {
        const tracking = JSON.parse(existingTracking);
        trackingIdRef.current = tracking.id;
      } else {
        // Create new tracking record in localStorage
        const trackingData: TrackingData = {
          id: generateUUID(),
          session_id: sessionId,
          user_id: userId,
          current_step: currentStep,
          highest_step_reached: currentStep,
          total_steps: totalSteps,
          user_agent: navigator.userAgent,
          current_step_name: stepName || getStepName(type, currentStep),
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        };

        // Add post-appointment specific fields using type assertion
        if (type === 'post_appointment') {
          (trackingData as PostAppointmentTrackingData).appointment_id = appointmentId;
          (trackingData as PostAppointmentTrackingData).current_step_original_number = originalStepNumber || currentStep;
        }

        localStorage.setItem(trackingKey, JSON.stringify(trackingData));
        trackingIdRef.current = trackingData.id;
        console.log('✅ Created tracking record in localStorage');
      }
    };

    initSession();
  }, [type, userId, appointmentId, currentStep, stepName, totalSteps, originalStepNumber]);

  // Enhanced session persistence during onboarding (only for authenticated users)
  useEffect(() => {
    const maintainSession = async () => {
      if (!userId) return;
      
      try {
        console.log('🔐 Maintaining session during onboarding...');
        
        // Check session every 30 seconds during onboarding
        const interval = setInterval(async () => {
          const sessionResult = await ensureOnboardingSession();
          
          if (!sessionResult.success) {
            console.warn('⚠️ Session lost during onboarding, attempting recovery...');
            const retryResult = await validateSessionWithRetry(2, 500);
            
            if (!retryResult.success) {
              console.error('❌ Session recovery failed during onboarding');
              // Don't redirect here - let the user continue and handle at completion
            } else {
              console.log('✅ Session recovered during onboarding');
            }
          }
        }, 30000); // Check every 30 seconds
        
        return () => clearInterval(interval);
      } catch (error) {
        console.error('❌ Error in session maintenance:', error);
      }
      
      return; // Add explicit return for all code paths
    };
    
    maintainSession();
  }, [userId]);

  // Track step changes (database for authenticated, localStorage for unauthenticated)
  useEffect(() => {
    const trackStepChange = async () => {
      if (!trackingIdRef.current || currentStep === lastStepRef.current) return;

      const timeOnLastStep = Math.floor((Date.now() - stepStartTimeRef.current) / 1000);
      const totalTime = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

      const updateData: any = {
        current_step: currentStep,
        current_step_name: stepName || getStepName(type, currentStep),
        last_active_at: new Date().toISOString(),
        time_on_last_step_seconds: timeOnLastStep,
        total_time_seconds: totalTime
      };

      if (type === 'post_appointment' && originalStepNumber) {
        updateData.current_step_original_number = originalStepNumber;
      }

      const tableName = `${type}_onboarding_tracking`;

      if (userId) {
        // Try to update database first for authenticated users
        try {
          // Update highest step if needed
          const { data: current } = await supabase
            .from(tableName)
            .select('highest_step_reached')
            .eq('id', trackingIdRef.current)
            .single();

          if (current && currentStep > current.highest_step_reached) {
            updateData.highest_step_reached = currentStep;
          }

          await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', trackingIdRef.current);

          console.log('✅ Updated tracking in database');
          // Reset step timer
          stepStartTimeRef.current = Date.now();
          lastStepRef.current = currentStep;
          return;
        } catch (error) {
          console.warn('⚠️ Database update failed, falling back to localStorage:', error);
        }
      }

      // Fallback to localStorage (for unauthenticated users or database failures)
      const trackingKey = `${type}_onboarding_tracking`;
      const existingTracking = localStorage.getItem(trackingKey);
      
      if (existingTracking) {
        const tracking = JSON.parse(existingTracking);
        
        // Update highest step if needed
        if (currentStep > tracking.highest_step_reached) {
          updateData.highest_step_reached = currentStep;
        }
        
        const updatedTracking = { ...tracking, ...updateData };
        localStorage.setItem(trackingKey, JSON.stringify(updatedTracking));
      }

      // Reset step timer
      stepStartTimeRef.current = Date.now();
      lastStepRef.current = currentStep;
    };

    trackStepChange();
  }, [currentStep, stepName, type, originalStepNumber, userId]);

  // Track completion (localStorage-based for unauthenticated users)
  const trackCompletion = async () => {
    if (!trackingIdRef.current) return;

    const totalTime = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

    // Update tracking data in localStorage
    const trackingKey = `${type}_onboarding_tracking`;
    const existingTracking = localStorage.getItem(trackingKey);
    
    if (existingTracking) {
      const tracking = JSON.parse(existingTracking);
      const updatedTracking = {
        ...tracking,
        completed_at: new Date().toISOString(),
        total_time_seconds: totalTime,
        dropped_off: false
      };
      localStorage.setItem(trackingKey, JSON.stringify(updatedTracking));
    }

    // Clear session
    sessionStorage.removeItem(`${type}_onboarding_session`);
  };

  // Track drop-off when component unmounts (localStorage-based)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (trackingIdRef.current && currentStep < totalSteps) {
        const timeOnLastStep = Math.floor((Date.now() - stepStartTimeRef.current) / 1000);
        const totalTime = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

        const dropData: any = {
          dropped_off: true,
          drop_off_step: currentStep,
          drop_off_step_name: stepName || getStepName(type, currentStep),
          drop_off_page: window.location.pathname,
          time_on_last_step_seconds: timeOnLastStep,
          total_time_seconds: totalTime,
          last_active_at: new Date().toISOString()
        };

        if (type === 'post_appointment' && originalStepNumber) {
          dropData.drop_off_original_step_number = originalStepNumber;
        }

        // Update tracking data in localStorage
        const trackingKey = `${type}_onboarding_tracking`;
        const existingTracking = localStorage.getItem(trackingKey);
        
        if (existingTracking) {
          const tracking = JSON.parse(existingTracking);
          const updatedTracking = { ...tracking, ...dropData };
          localStorage.setItem(trackingKey, JSON.stringify(updatedTracking));
        }

        // Use sendBeacon for reliability (only if authenticated)
        if (userId) {
          navigator.sendBeacon(
            `/api/track-onboarding-dropoff`,
            JSON.stringify({
              table: `${type}_onboarding_tracking`,
              id: trackingIdRef.current,
              data: dropData
            })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Also call on component unmount
    };
  }, [currentStep, totalSteps, stepName, type, originalStepNumber, userId]);

  return { trackCompletion };
}
