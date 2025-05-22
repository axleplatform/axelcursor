import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-10 w-64 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Mechanics List */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-8 w-48 mb-4" />

          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>

        {/* Right Column - Order Summary & Payment */}
        <div className="lg:col-span-1">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
