"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, User, Loader2, Clock, MapPin, Check, X, ChevronLeft, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { UpcomingAppointments } from "@/components/upcoming-appointments"
import { useToast } from "@/components/ui/use-toast"
import Footer from "@/components/footer"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import MechanicSchedule from "@/components/mechanic-schedule"
import {
  getAvailableAppointmentsForMechanic,
  getQuotedAppointmentsForMechanic,
  createOrUpdateQuote,
} from "@/lib/mechanic-quotes"
import { formatDate } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface Appointment {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
  car_runs?: boolean
  selected_services?: string[]
  users?: {
    id: string
    email: string
    raw_user_meta_data?: {
      is_anonymous?: boolean
    }
  }
  vehicles?: {
    year: string
    make: string
    model: string
    vin?: string
    mileage?: number
  }
  quote?: {
    id: string
    price: number
    created_at: string
  }
}

export default function MechanicDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicProfile, setMechanicProfile] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const supabase = createClientComponentClient()

  // Appointment states
  const [availableAppointments, setAvailableAppointments] = useState<Appointment[]>([])
  const [quotedAppointments, setQuotedAppointments] = useState<Appointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication in dashboard...")
        setIsAuthLoading(true)

        // First try to get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("Session error:", sessionError)
          throw sessionError
        }

        if (!session) {
          console.log("No session found, redirecting to login")
          toast({
            title: "Authentication required",
            description: "Please log in to access your dashboard",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        console.log("Session found:", {
          userId: session.user.id,
          email: session.user.email
        })

        // Get mechanic profile
        const { data: profile, error: profileError } = await supabase
          .from("mechanic_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single()

        if (profileError) {
          console.error("Error fetching mechanic profile:", profileError)
          throw profileError
        }

        if (!profile) {
          console.log("No mechanic profile found, redirecting to onboarding")
          router.push("/onboarding-mechanic-1")
          return
        }

        console.log("Mechanic profile found:", profile)
        setMechanicId(session.user.id)
        setMechanicProfile(profile)

        // Fetch appointments
        console.log("Fetching appointments...")
        const [available, quoted, upcoming] = await Promise.all([
          getAvailableAppointmentsForMechanic(session.user.id),
          getQuotedAppointmentsForMechanic(session.user.id),
          supabase
            .from("appointments")
            .select("*, vehicles(*)")
            .eq("mechanic_id", session.user.id)
            .in("status", ["confirmed", "in_progress", "pending_payment"])
            .order("appointment_date", { ascending: true }),
        ])

        console.log("Appointments fetched:", { available, quoted, upcoming })
        setAvailableAppointments(available || [])
        setQuotedAppointments(quoted || [])
        setUpcomingAppointments(upcoming?.data || [])
      } catch (error) {
        console.error("Error in auth check:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard. Please try again.",
          variant: "destructive",
        })
        router.push("/login")
      } finally {
        setIsAuthLoading(false)
        setIsAppointmentsLoading(false)
      }
    }

    checkAuth()
  }, [router, toast, supabase])

  const fetchAppointments = async () => {
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          users:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .order('appointment_date', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to include user information
      const transformedAppointments = appointments.map((appointment: Appointment) => ({
        ...appointment,
        is_guest: appointment.users?.raw_user_meta_data?.is_anonymous || false,
        user_email: appointment.users?.email || 'Anonymous User'
      }));

      setAppointments(transformedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
    }
  };

  // Update the appointment card to show user information
  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const isGuest = appointment.users?.raw_user_meta_data?.is_anonymous || false;
    
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            {isGuest ? 'Guest Appointment' : 'User Appointment'}
          </CardTitle>
          <CardDescription>
            {appointment.users?.email || 'Anonymous User'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Rest of the appointment card content */}
        </CardContent>
      </Card>
    );
  };

  // Verify session multiple times
  useEffect(() => {
    const verifySession = async () => {
      let retries = 3;
      while (retries > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log("Session state:", {
            hasSession: true,
            userId: session.user.id,
            cookies: document.cookie,
            timestamp: new Date().toISOString()
          });
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
        retries--;
      }
    };

    verifySession();
  }, [supabase]);

  return (
    <div className="flex flex-col h-screen">
      <SiteHeader />
      <main className="flex-1 p-4">
        {/* Rest of the component content */}
      </main>
      <Footer />
    </div>
  );
} 