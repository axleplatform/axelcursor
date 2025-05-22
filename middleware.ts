import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  console.log("Middleware called for path:", req.nextUrl.pathname)
  
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log("Session in middleware:", session?.user?.id)

  // If there's no session and the user is trying to access protected routes
  if (!session) {
    if (req.nextUrl.pathname.startsWith("/mechanic/dashboard")) {
      console.log("No session, redirecting to login")
      // Redirect to the login page
      const redirectUrl = new URL("/login", req.url)
      redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  } else {
    // User is logged in, check if they're a mechanic
    console.log("Checking mechanic profile in middleware")
    const { data: mechanicProfile, error: profileError } = await supabase
      .from("mechanic_profiles")
      .select("onboarding_completed, onboarding_step, id")
      .eq("user_id", session.user.id)
      .single()

    console.log("Mechanic profile in middleware:", mechanicProfile)
    console.log("Profile error in middleware:", profileError)

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking mechanic profile in middleware:", profileError)
      return res
    }

    if (mechanicProfile) {
      console.log("Onboarding completed in middleware:", mechanicProfile.onboarding_completed)
      console.log("Onboarding step in middleware:", mechanicProfile.onboarding_step)
      
      // If trying to access dashboard but onboarding is not complete
      if (req.nextUrl.pathname.startsWith("/mechanic/dashboard") && !mechanicProfile.onboarding_completed) {
        const step = mechanicProfile.onboarding_step || "personal_info"
        const stepNumber = getStepNumber(step)
        console.log("Redirecting to onboarding step in middleware:", stepNumber)
        return NextResponse.redirect(new URL(`/onboarding-mechanic-${stepNumber}`, req.url))
      }

      // If trying to access onboarding but it's already complete
      if (req.nextUrl.pathname.startsWith("/onboarding-mechanic-") && mechanicProfile.onboarding_completed) {
        console.log("Onboarding complete, redirecting to dashboard in middleware")
        return NextResponse.redirect(new URL("/mechanic/dashboard", req.url))
      }

      // Allow access to dashboard if onboarding is complete
      if (req.nextUrl.pathname.startsWith("/mechanic/dashboard") && mechanicProfile.onboarding_completed) {
        console.log("Onboarding complete, allowing access to dashboard")
        return res
      }
    }
  }

  console.log("Middleware allowing request to continue")
  return res
}

// Helper function to get step number
function getStepNumber(step: string): string {
  switch (step) {
    case "personal_info": return "1"
    case "professional_info": return "2"
    case "certifications": return "3"
    case "rates": return "4"
    case "profile": return "5"
    default: return "1"
  }
}

// Specify the paths that should be protected by the middleware
export const config = {
  matcher: [
    "/mechanic/dashboard/:path*",
    "/onboarding-mechanic-:path*",
  ],
}
