"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface MechanicProfile {
  id: string
  first_name: string
  last_name: string
  rating?: number // 0.0 to 5.0
  review_count?: number // Number of reviews, default 0
  specialized_cars: Array<{
    make: string
    model: string
  }>
  [key: string]: any // For other profile properties
}

export default function ProfileChecker(): JSX.Element {
  const [profiles, setProfiles] = useState<MechanicProfile[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedProfile, setSelectedProfile] = useState<MechanicProfile | null>(null)

  const fetchProfiles = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('mechanic_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setProfiles(data || [])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error fetching profiles:', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const showProfile = async (profileId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('mechanic_profiles')
        .select('*')
        .eq('id', profileId)
        .single()
      
      if (error) throw error
      setSelectedProfile(data)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error fetching profile:', errorMessage)
    }
  }

  useEffect((): void => {
    fetchProfiles()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Mechanic Profile Checker</h1>
      
      <div className="grid gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            All Profiles ({profiles.length})
          </h2>
          
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div 
                key={profile.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={(): Promise<void> => showProfile(profile.id)}
              >
                <div className="font-medium">
                  {profile.first_name} {profile.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  ID: {profile.id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedProfile && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Details</h2>
            
            <div className="space-y-4">
              <div>
                <strong>Name:</strong> {selectedProfile.first_name} {selectedProfile.last_name}
              </div>
              
              <div>
                <strong>ID:</strong> {selectedProfile.id}
              </div>

              <div>
                <strong>Specialized Cars:</strong>
                <div className="mt-2 grid gap-2">
                  {selectedProfile.specialized_cars.map((car: { make: string; model: string }, index: number) => (
                    <div key={index} className="p-2 bg-gray-100 rounded">
                      {car.make} {car.model}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <strong>Full Profile Data:</strong>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
                  {JSON.stringify(selectedProfile, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
