"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ProfileCheckerPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<any>(null)

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from("mechanic_profiles")
          .select(
            "id, user_id, first_name, last_name, email, onboarding_step, onboarding_completed, created_at, updated_at",
          )
          .order("updated_at", { ascending: false })

        if (error) throw error

        setProfiles(data || [])
      } catch (err: any) {
        setError(`Error fetching profiles: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfiles()
  }, [])

  const fetchProfileDetails = async (profileId: string) => {
    try {
      setSelectedProfile(null)

      const { data, error } = await supabase.from("mechanic_profiles").select("*").eq("id", profileId).single()

      if (error) throw error

      setSelectedProfile(data)
    } catch (err: any) {
      setError(`Error fetching profile details: ${err.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#294a46]" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Mechanic Profile Checker</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white p-4 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-2">Profiles ({profiles.length})</h2>

          <div className="overflow-y-auto max-h-[70vh]">
            {profiles.length === 0 ? (
              <p className="text-gray-500">No profiles found</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {profiles.map((profile) => (
                  <li key={profile.id} className="py-2">
                    <button
                      onClick={() => fetchProfileDetails(profile.id)}
                      className="w-full text-left hover:bg-gray-50 p-2 rounded"
                    >
                      <p className="font-medium">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                      <div className="flex items-center mt-1">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            profile.onboarding_completed
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {profile.onboarding_completed ? "Completed" : profile.onboarding_step}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          Updated: {new Date(profile.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-2">Profile Details</h2>

          {selectedProfile ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="font-medium">Basic Information</h3>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="text-gray-500">Name:</span> {selectedProfile.first_name}{" "}
                      {selectedProfile.last_name}
                    </p>
                    <p>
                      <span className="text-gray-500">Email:</span> {selectedProfile.email}
                    </p>
                    <p>
                      <span className="text-gray-500">Phone:</span> {selectedProfile.phone_number}
                    </p>
                    <p>
                      <span className="text-gray-500">DOB:</span> {selectedProfile.date_of_birth}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium">Business Information</h3>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="text-gray-500">Start Year:</span> {selectedProfile.business_start_year || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Address:</span> {selectedProfile.address || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Service Radius:</span>{" "}
                      {selectedProfile.service_radius ? `${selectedProfile.service_radius} miles` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Vehicle Information</h3>
                <div className="mt-2 space-y-1">
                  {selectedProfile.vehicle_year ? (
                    <>
                      <p>
                        <span className="text-gray-500">Vehicle:</span> {selectedProfile.vehicle_year}{" "}
                        {selectedProfile.vehicle_make} {selectedProfile.vehicle_model}
                      </p>
                      <p>
                        <span className="text-gray-500">License Plate:</span> {selectedProfile.license_plate}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">No vehicle information</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Bio</h3>
                <div className="mt-2">
                  {selectedProfile.bio ? (
                    <p className="text-gray-700">{selectedProfile.bio}</p>
                  ) : (
                    <p className="text-gray-500">No bio provided</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Specialties & Preferences</h3>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Specialized Cars</h4>
                    {selectedProfile.specialized_cars && selectedProfile.specialized_cars.length > 0 ? (
                      <ul className="mt-1 list-disc list-inside">
                        {selectedProfile.specialized_cars.map((car: any, index: number) => (
                          <li key={index} className="text-sm">
                            {car.make} {car.model}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">None specified</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium">Least Favorite Brands</h4>
                    {selectedProfile.least_favorite_brands && selectedProfile.least_favorite_brands.length > 0 ? (
                      <ul className="mt-1 list-disc list-inside">
                        {selectedProfile.least_favorite_brands.map((brand: string, index: number) => (
                          <li key={index} className="text-sm">
                            {brand}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">None specified</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Metadata (JSON)</h3>
                <div className="mt-2 bg-gray-50 p-3 rounded-md overflow-auto max-h-[300px]">
                  <pre className="text-xs">{JSON.stringify(selectedProfile.metadata, null, 2)}</pre>
                </div>
              </div>

              <div>
                <h3 className="font-medium">Onboarding Status</h3>
                <div className="mt-2">
                  <p>
                    <span className="text-gray-500">Step:</span> {selectedProfile.onboarding_step}
                  </p>
                  <p>
                    <span className="text-gray-500">Completed:</span>{" "}
                    {selectedProfile.onboarding_completed ? "Yes" : "No"}
                  </p>
                  <p>
                    <span className="text-gray-500">Created:</span>{" "}
                    {new Date(selectedProfile.created_at).toLocaleString()}
                  </p>
                  <p>
                    <span className="text-gray-500">Last Updated:</span>{" "}
                    {new Date(selectedProfile.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a profile to view details</p>
          )}
        </div>
      </div>
    </div>
  )
}
