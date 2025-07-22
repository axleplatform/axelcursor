export default function PostAppointmentOnboardingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294a46] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your information...</p>
      </div>
    </div>
  );
} 