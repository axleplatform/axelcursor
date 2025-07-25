"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    async function handleAuth() {
      const { data } = await (supabase.auth as any).getSession()

      if (data?.session) {
        const user = data.session.user

        // Check if the user has completed onboarding
        if (user.user_metadata?.onboarding_completed === true && user.user_metadata?.onboarding_step === "completed") {
          // User has completed onboarding, redirect to dashboard
          router.push("/mechanic/dashboard")
          return
        }

        // Determine which onboarding step to redirect to
        const onboardingStep = user.user_metadata?.onboarding_step || "personal_info"

        switch (onboardingStep) {
          case "personal_info":
            router.push("/onboarding-mechanic-1")
            break
          case "professional_info":
            router.push("/onboarding-mechanic-2")
            break
          case "certifications":
            router.push("/onboarding-mechanic-3")
            break
          case "rates":
            router.push("/onboarding-mechanic-4")
            break
          case "profile":
            router.push("/onboarding-mechanic-5")
            break
          default:
            router.push("/onboarding-mechanic-1")
        }
      } else {
        router.push("/login")
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold text-gray-800">Authenticating...</h1>
      <p className="text-gray-600 mt-2">Please wait while we set up your account.</p>
    </div>
  )
}
