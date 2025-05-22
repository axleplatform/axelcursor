import React from "react"
import { cn } from "@/lib/utils"

interface OnboardingHeaderProps {
  currentStep: number
  title?: string
  subtitle?: string
  totalSteps?: number
}

export default function OnboardingHeader({
  currentStep,
  title = "Mechanic Onboarding",
  subtitle = "Fill out the information",
  totalSteps = 5,
}: OnboardingHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-2">{title}</h1>
      <p className="text-center text-gray-600 mb-4 md:mb-6">{subtitle}</p>

      <div className="flex items-center justify-center py-2 max-w-full overflow-hidden">
        <div className="flex items-center w-full justify-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              {/* Step circle */}
              <div
                className={cn(
                  "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium",
                  index + 1 <= currentStep ? "bg-[#294a46] text-white" : "bg-gray-200 text-gray-700",
                )}
              >
                {index + 1}
              </div>

              {/* Connector line (don't render after the last step) */}
              {index < totalSteps - 1 && (
                <div className={cn("w-8 md:w-16 h-1", index + 1 < currentStep ? "bg-[#294a46]" : "bg-gray-200")}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
