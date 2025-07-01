"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Loader2,  X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera } from "lucide-react"

interface ProfileImageUploadProps {
  initialImageUrl?: string | null
  onImageChange: (url: string | null) => void
  userId: string
}

export default function ProfileImageUpload({ initialImageUrl, onImageChange, userId }: ProfileImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Update local state when initialImageUrl prop changes
  useEffect(() => {
    if (initialImageUrl !== undefined) {
      setImageUrl(initialImageUrl)
    }
  }, [initialImageUrl])

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB")
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      // Ensure the storage bucket exists
      try {
        const { error: bucketError } = await supabase.storage.getBucket("profile-images")
        if (bucketError && bucketError.message.includes("does not exist")) {
          // Create the bucket if it doesn't exist
          await supabase.storage.createBucket("profile-images", {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024, // 5MB
          })
        }
      } catch (bucketError) {
        console.warn("Error checking/creating bucket:", bucketError)
        // Continue anyway, the bucket might already exist
      }

      // Delete previous image if exists
      if (imageUrl) {
        try {
          const previousPath = imageUrl.split("/").pop()
          if (previousPath) {
            await supabase.storage.from("profile-images").remove([previousPath])
          }
        } catch (deleteError) {
          console.warn("Error deleting previous image:", deleteError)
          // Continue anyway, this is just cleanup
        }
      }

      // Generate a unique file name
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload the new image
      const { error: uploadError, data } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: publicUrlData } = supabase.storage.from("profile-images").getPublicUrl(filePath)

      const newImageUrl = publicUrlData.publicUrl
      setImageUrl(newImageUrl)
      onImageChange(newImageUrl)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error uploading image:', errorMessage);
      setError("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  // Handle image removal
  const handleRemoveImage = async (): Promise<void> => {
    if (!imageUrl) return

    setIsUploading(true)

    try {
      // Delete the image from storage
      const filePath = imageUrl.split("/").pop()
      if (filePath) {
        const { error: deleteError } = await supabase.storage.from("profile-images").remove([filePath])
        
        if (deleteError) {
          console.warn("Error deleting previous image:", deleteError)
        }
      }

      setImageUrl(null)
      onImageChange(null)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error removing image:', errorMessage);
    } finally {
      setIsUploading(false)
    }
  }

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Image Preview or Placeholder */}
      <div className="flex justify-center">
        <div className="relative">
          <div
            className={cn(
              "w-32 h-32 rounded-full overflow-hidden border-2 flex items-center justify-center",
              imageUrl ? "border-[#294a46]" : "border-gray-200 bg-gray-50",
            )}
          >
            {imageUrl ? (
              <img src={imageUrl || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="h-16 w-16 text-gray-400" />
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Remove Button (only show if image exists) */}
          {imageUrl && !isUploading && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-white font-medium",
            isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-[#294a46] hover:bg-[#1e3632]",
          )}
        >
          <div className="h-4 w-4">📤</div>
          {imageUrl ? "Change Photo" : "Upload Photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Error Message */}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {/* Help Text */}
      <p className="text-gray-500 text-xs text-center">
        Upload a professional photo of yourself. This will be visible to customers.
      </p>
    </div>
  )
}
