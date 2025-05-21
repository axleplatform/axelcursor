"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Common car makes for the dropdown
const CAR_MAKES = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Porsche",
  "Ram",
  "Rolls-Royce",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
]

// Car models by make (simplified for common makes)
const CAR_MODELS: Record<string, string[]> = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "4Runner", "Tacoma", "Tundra", "Prius", "Sienna", "Avalon"],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline", "Fit", "Passport", "Insight"],
  Ford: ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Ranger", "Expedition", "Bronco", "Fusion", "Focus"],
  Chevrolet: [
    "Silverado",
    "Equinox",
    "Tahoe",
    "Traverse",
    "Malibu",
    "Camaro",
    "Suburban",
    "Colorado",
    "Blazer",
    "Trax",
  ],
  BMW: ["3 Series", "5 Series", "X3", "X5", "7 Series", "X1", "X7", "4 Series", "2 Series", "i4"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE", "S-Class", "A-Class", "GLA", "GLB", "CLA", "G-Class"],
  Audi: ["A4", "Q5", "A6", "Q7", "A3", "Q3", "A5", "Q8", "e-tron", "A7"],
  Nissan: ["Altima", "Rogue", "Sentra", "Pathfinder", "Murano", "Frontier", "Kicks", "Armada", "Maxima", "Titan"],
  Hyundai: ["Elantra", "Tucson", "Santa Fe", "Sonata", "Kona", "Palisade", "Venue", "Accent", "Ioniq", "Veloster"],
  Kia: ["Forte", "Sportage", "Sorento", "Soul", "Telluride", "Seltos", "Rio", "Niro", "Carnival", "K5"],
  Subaru: ["Outback", "Forester", "Crosstrek", "Impreza", "Ascent", "Legacy", "WRX", "BRZ", "Solterra"],
  Volkswagen: ["Jetta", "Tiguan", "Atlas", "Passat", "Golf", "Taos", "ID.4", "Arteon", "Atlas Cross Sport"],
  Jeep: ["Grand Cherokee", "Wrangler", "Cherokee", "Compass", "Renegade", "Gladiator", "Wagoneer", "Grand Wagoneer"],
  Lexus: ["RX", "NX", "ES", "GX", "IS", "UX", "LX", "LS", "RC", "LC"],
  Mazda: ["CX-5", "Mazda3", "CX-9", "CX-30", "Mazda6", "MX-5 Miata", "CX-50"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  Acura: ["MDX", "RDX", "TLX", "ILX", "NSX", "Integra"],
  Buick: ["Encore", "Enclave", "Envision", "Encore GX"],
  Cadillac: ["XT5", "Escalade", "XT4", "CT5", "XT6", "CT4"],
  Chrysler: ["Pacifica", "300"],
  Dodge: ["Charger", "Challenger", "Durango", "Hornet"],
  GMC: ["Sierra", "Terrain", "Acadia", "Yukon", "Canyon", "Hummer EV"],
  Infiniti: ["QX60", "QX50", "QX80", "Q50", "QX55"],
  Lincoln: ["Corsair", "Nautilus", "Aviator", "Navigator"],
  Mitsubishi: ["Outlander", "Eclipse Cross", "Outlander Sport", "Mirage"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan", "718 Cayman", "718 Boxster"],
  Ram: ["1500", "2500", "3500", "ProMaster"],
  Volvo: ["XC90", "XC60", "XC40", "S60", "S90", "V60", "V90"],
}

// For makes not in our predefined list, provide some generic models
const GENERIC_MODELS = ["Sedan", "SUV", "Coupe", "Truck", "Hatchback", "Convertible", "Wagon", "Van", "Crossover"]

interface VehicleInfoFormProps {
  initialData?: {
    year?: number
    make?: string
    model?: string
    licensePlate?: string
  }
  onChange: (data: { year: number; make: string; model: string; licensePlate: string }) => void
  errors?: {
    year?: string
    make?: string
    model?: string
    licensePlate?: string
  }
}

export default function VehicleInfoForm({ initialData = {}, onChange, errors = {} }: VehicleInfoFormProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const [year, setYear] = useState<number | undefined>(initialData.year)
  const [make, setMake] = useState(initialData.make || "")
  const [model, setModel] = useState(initialData.model || "")
  const [licensePlate, setLicensePlate] = useState(initialData.licensePlate || "")

  const [makeSearchTerm, setMakeSearchTerm] = useState(initialData.make || "")
  const [modelSearchTerm, setModelSearchTerm] = useState(initialData.model || "")
  const [showMakeDropdown, setShowMakeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  const makeDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  // Filter makes based on search term
  const filteredMakes = CAR_MAKES.filter((make) => make.toLowerCase().includes(makeSearchTerm.toLowerCase()))

  // Get models for the selected make
  const getModelsForMake = (make: string) => {
    return CAR_MODELS[make] || GENERIC_MODELS
  }

  // Filter models based on search term
  const filteredModels = make
    ? getModelsForMake(make).filter((model) => model.toLowerCase().includes(modelSearchTerm.toLowerCase()))
    : []

  // Update parent component when form values change
  useEffect(() => {
    // Only call onChange when we have complete data AND something has actually changed
    if (year && make && model && licensePlate) {
      // Create the new data object
      const newData = { year, make, model, licensePlate }

      // Compare with initialData to prevent unnecessary updates
      const hasChanged =
        newData.year !== initialData.year ||
        newData.make !== initialData.make ||
        newData.model !== initialData.model ||
        newData.licensePlate !== initialData.licensePlate

      // Only call onChange if data has actually changed
      if (hasChanged) {
        onChange(newData)
      }
    }
  }, [year, make, model, licensePlate, onChange, initialData])

  // Handle make selection
  const handleMakeSelect = (selectedMake: string) => {
    setMake(selectedMake)
    setMakeSearchTerm(selectedMake)
    setShowMakeDropdown(false)
    setModel("")
    setModelSearchTerm("")
  }

  // Handle model selection
  const handleModelSelect = (selectedModel: string) => {
    setModel(selectedModel)
    setModelSearchTerm(selectedModel)
    setShowModelDropdown(false)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (makeDropdownRef.current && !makeDropdownRef.current.contains(event.target as Node)) {
        setShowMakeDropdown(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Year Dropdown */}
      <div>
        <label htmlFor="vehicle-year" className="block text-sm font-medium text-gray-700 mb-1">
          Year <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            id="vehicle-year"
            value={year || ""}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
            className={cn(
              "block w-full px-3 py-2 border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]",
              errors.year && "border-red-300 focus:border-red-500 focus:ring-red-500",
            )}
          >
            <option value="">Select Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year}</p>}
      </div>

      {/* Make Dropdown */}
      <div>
        <label htmlFor="vehicle-make" className="block text-sm font-medium text-gray-700 mb-1">
          Make <span className="text-red-500">*</span>
        </label>
        <div className="relative" ref={makeDropdownRef}>
          <input
            id="vehicle-make"
            type="text"
            value={makeSearchTerm}
            onChange={(e) => {
              setMakeSearchTerm(e.target.value)
              setShowMakeDropdown(true)
              if (e.target.value !== make) {
                setMake("")
              }
            }}
            onFocus={() => setShowMakeDropdown(true)}
            placeholder="Select or type a make"
            className={cn(
              "block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]",
              errors.make && "border-red-300 focus:border-red-500 focus:ring-red-500",
            )}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>

          {showMakeDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredMakes.length > 0 ? (
                filteredMakes.map((make) => (
                  <div
                    key={make}
                    onClick={() => handleMakeSelect(make)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {make}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500">No makes found</div>
              )}
            </div>
          )}
        </div>
        {errors.make && <p className="mt-1 text-sm text-red-600">{errors.make}</p>}
      </div>

      {/* Model Dropdown */}
      <div>
        <label htmlFor="vehicle-model" className="block text-sm font-medium text-gray-700 mb-1">
          Model <span className="text-red-500">*</span>
        </label>
        <div className="relative" ref={modelDropdownRef}>
          <input
            id="vehicle-model"
            type="text"
            value={modelSearchTerm}
            onChange={(e) => {
              setModelSearchTerm(e.target.value)
              setShowModelDropdown(true)
              if (e.target.value !== model) {
                setModel("")
              }
            }}
            onFocus={() => {
              if (make) {
                setShowModelDropdown(true)
              }
            }}
            placeholder={make ? "Select or type a model" : "Select a make first"}
            disabled={!make}
            className={cn(
              "block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]",
              !make && "bg-gray-50 cursor-not-allowed",
              errors.model && "border-red-300 focus:border-red-500 focus:ring-red-500",
            )}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>

          {showModelDropdown && make && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => (
                  <div
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {model}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500">No models found</div>
              )}
            </div>
          )}
        </div>
        {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model}</p>}
      </div>

      {/* License Plate */}
      <div>
        <label htmlFor="license-plate" className="block text-sm font-medium text-gray-700 mb-1">
          License Plate <span className="text-red-500">*</span>
        </label>
        <input
          id="license-plate"
          type="text"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
          placeholder="Enter license plate"
          className={cn(
            "block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]",
            errors.licensePlate && "border-red-300 focus:border-red-500 focus:ring-red-500",
          )}
        />
        {errors.licensePlate && <p className="mt-1 text-sm text-red-600">{errors.licensePlate}</p>}
      </div>
    </div>
  )
}
