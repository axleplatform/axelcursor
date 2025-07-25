import { supabase } from "@/lib/supabase"

/**
 * Utility function to save mechanic profile data
 * This centralizes all mechanic profile updates to ensure consistency
 */
export async function saveMechanicProfile(
  userId: string,
  data: {
    standardFields?: Record<string, any>
    metadataFields?: Record<string, any>
    onboardingStep?: string
  },
) {
  // Get existing profile or create a new one
  const { data: existingProfile, error: fetchError } = await supabase
    .from("mechanic_profiles")
    .select("id, metadata")
    .eq("user_id", userId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    throw new Error(`Error fetching mechanic profile: ${fetchError.message}`)
  }

  const now = new Date().toISOString()

  if (!existingProfile) {
    // Create new profile
    const { data: newProfile, error: insertError } = await supabase
      .from("mechanic_profiles")
      .insert([
        {
          user_id: userId,
          ...data.standardFields,
          metadata: data.metadataFields || {},
          onboarding_step: data.onboardingStep || "personal_info",
          created_at: now,
          updated_at: now,
        },
      ])
      .select("id")

    if (insertError) {
      throw new Error(`Error creating mechanic profile: ${insertError.message}`)
    }

    return newProfile?.[0]?.id
  } else {
    // Update existing profile
    const currentMetadata = existingProfile.metadata || {}

    const { error: updateError } = await supabase
      .from("mechanic_profiles")
      .update({
        ...data.standardFields,
        metadata: data.metadataFields ? { ...currentMetadata, ...data.metadataFields } : currentMetadata,
        onboarding_step: data.onboardingStep || existingProfile.onboarding_step,
        updated_at: now,
      })
      .eq("id", existingProfile.id)

    if (updateError) {
      throw new Error(`Error updating mechanic profile: ${updateError.message}`)
    }

    return existingProfile.id
  }
}

/**
 * Utility function to get mechanic profile data
 */
export async function getMechanicProfile(userId: string) {
  const { data, error } = await supabase.from("mechanic_profiles").select("*, metadata").eq("user_id", userId).single()

  if (error) {
    if (error.code === "PGRST116") {
      return null // Profile doesn't exist yet
    }
    throw new Error(`Error fetching mechanic profile: ${error.message}`)
  }

  return data
}

/**
 * Utility function to mark onboarding as complete
 */
export async function completeMechanicOnboarding(profileId: string) {
  const { error } = await supabase
    .from("mechanic_profiles")
    .update({
      onboarding_completed: true,
      onboarding_step: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)

  if (error) {
    throw new Error(`Error completing onboarding: ${error.message}`)
  }

  return true
}

/**
 * Utility function to log profile changes for debugging/auditing
 */
export async function logProfileChange(
  userId: string,
  profileId: string,
  action: string,
  details: Record<string, any>,
) {
  try {
    // Store logs in a separate table or in metadata
    const { error } = await supabase
      .from("mechanic_profiles")
      .update({
        metadata: (supabase as any).rpc("jsonb_set", {
          jsonb: (supabase as any).rpc("jsonb_get", {
            jsonb: (supabase as any).rpc("coalesce", {
              val1: (supabase as any).rpc("jsonb_get", {
                jsonb: (supabase as any).rpc("coalesce", {
                  val1: (supabase as any).raw("metadata"),
                  val2: "{}",
                }),
                path: "logs",
              }),
              val2: "[]",
            }),
            path: "",
          }),
          path: "",
          value: JSON.stringify([
            ...JSON.parse(
              (supabase as any).rpc("coalesce", {
                val1: (supabase as any).rpc("jsonb_get", {
                  jsonb: (supabase as any).rpc("coalesce", {
                    val1: (supabase as any).raw("metadata"),
                    val2: "{}",
                  }),
                  path: "logs",
                }),
                val2: "[]",
              }),
            ),
            {
              timestamp: new Date().toISOString(),
              action,
              details,
            },
          ]),
        }),
      })
      .eq("id", profileId)

    if (error) {
      console.error("Error logging profile change:", error)
    }
  } catch (error) {
    console.error("Error in logProfileChange:", error)
    // Don't throw - this is just for logging
  }
}
