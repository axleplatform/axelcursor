"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClientComponentClient()

    async function handleAuth() {
      const { data } = await supabase.auth.getSession()

      if (data?.session) {
        const user = data.session.user

        let redirectPath = "/mechanic/dashboard"

        // Check if the user has completed onboarding
        if (user.user_metadata?.onboarding_completed === true && user.user_metadata?.onboarding_step === "completed") {
          // User has completed onboarding, redirect to dashboard
          redirectPath = "/mechanic/dashboard"
        } else {
          // Determine which onboarding step to redirect to
          const onboardingStep = user.user_metadata?.onboarding_step || "personal_info"

          switch (onboardingStep) {
            case "personal_info":
              redirectPath = "/onboarding-mechanic-1"
              break
            case "professional_info":
              redirectPath = "/onboarding-mechanic-2"
              break
            case "certifications":
              redirectPath = "/onboarding-mechanic-3"
              break
            case "rates":
              redirectPath = "/onboarding-mechanic-4"
              break
            case "profile_completion":
              redirectPath = "/onboarding-mechanic-5"
              break
            default:
              redirectPath = "/onboarding-mechanic-1"
          }
        }

        router.push(redirectPath)
      } else {
        router.push("/login")
      }
    }

    handleAuth()
  }, [router])

  return (
    <div>
      <h1>Authenticating...</h1>
    </div>
  )
}
