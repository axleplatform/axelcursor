import { supabase } from "./supabase"

export async function createProfileImagesBucket() {
  try {
    // Check if the bucket already exists
    const { data: buckets, error: listError } = await (supabase as any).storage.listBuckets()

    if (listError) {
      throw listError
    }

    const bucketExists = buckets.some((bucket: { name: string }) => bucket.name === "profile-images")

    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await (supabase as any).storage.createBucket("profile-images", {
        public: true, // Make the bucket public so we can access images without authentication
        fileSizeLimit: 5242880, // 5MB limit
        allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
      })

      if (createError) {
        throw createError
      }

      console.log("Created profile-images bucket")
    }

    return true
  } catch (error) {
    console.error("Error creating storage bucket:", error)
    return false
  }
}
