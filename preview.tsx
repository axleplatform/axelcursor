"use client"

import { useState } from "react"
import { ChevronLeft, Upload, User } from "lucide-react"

export default function OnboardingMechanic5Preview() {
  // Mock state for demonstration
  const [bio, setBio] = useState("")
  const [imagePreview, setImagePreview] = useState(null)

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header (simplified) */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold text-[#294a46]">Axle</div>
            <div className="flex space-x-4">
              <button className="text-gray-600 hover:text-gray-900">Help</button>
              <button className="text-gray-600 hover:text-gray-900">Login</button>
            </div>
          </div>
        </div>
      </header>

      <main className="py-4 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <div className="flex items-center mb-3">
            <button className="mr-2 p-1.5 rounded-full hover:bg-gray-200 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Onboarding Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
            <div className="mt-2 flex items-center">
              <div className="flex-1 flex space-x-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${step <= 5 ? "bg-[#294a46]" : "bg-gray-200"}`}
                  />
                ))}
              </div>
              <span className="ml-3 text-sm font-medium text-gray-500">Step 5 of 5</span>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            <form className="divide-y divide-gray-100">
              {/* Profile Image Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload a professional photo of yourself. This will be visible to customers.
                </p>

                <div className="space-y-4">
                  {/* Image Preview */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                        <User className="h-16 w-16 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Upload Button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-white font-medium bg-[#294a46] hover:bg-[#1e3632]"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </button>
                  </div>

                  <p className="text-gray-500 text-xs text-center">
                    Upload a professional photo of yourself. This will be visible to customers.
                  </p>
                </div>
              </div>

              {/* Bio Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">About You</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Write a short bio about yourself, your experience, and your approach to auto repair.
                </p>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={5}
                    placeholder="Tell customers about your experience, specialties, and approach to auto repair..."
                    className="block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum 10 characters</p>
                </div>
              </div>

              {/* Vehicle Information Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Vehicle</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Please provide information about the vehicle you use for your mobile mechanic service.
                </p>

                <div className="space-y-4">
                  {/* Year Dropdown */}
                  <div>
                    <label htmlFor="vehicle-year" className="block text-sm font-medium text-gray-700 mb-1">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="vehicle-year"
                        className="block w-full px-3 py-2 border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                      >
                        <option value="">Select Year</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                        {/* More years would be here */}
                      </select>
                    </div>
                  </div>

                  {/* Make Dropdown */}
                  <div>
                    <label htmlFor="vehicle-make" className="block text-sm font-medium text-gray-700 mb-1">
                      Make <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="vehicle-make"
                        type="text"
                        placeholder="Select or type a make"
                        className="block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                      />
                    </div>
                  </div>

                  {/* Model Dropdown */}
                  <div>
                    <label htmlFor="vehicle-model" className="block text-sm font-medium text-gray-700 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="vehicle-model"
                        type="text"
                        placeholder="Select a make first"
                        disabled
                        className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* License Plate */}
                  <div>
                    <label htmlFor="license-plate" className="block text-sm font-medium text-gray-700 mb-1">
                      License Plate <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="license-plate"
                      type="text"
                      placeholder="Enter license plate"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="px-6 py-4 bg-gray-50">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#294a46] hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a46] transition-colors"
                >
                  Finish
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer (simplified) */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center text-gray-500 text-sm">© 2023 Axle. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
