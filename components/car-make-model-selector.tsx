"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, X, ChevronRight } from "lucide-react"
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

interface CarMakeModelSelectorProps {
  onAddCar: (make: string, model: string) => void
  selectedCars: Array<{ make: string; model: string }>
  onRemoveCar: (index: number) => void
}

export default function CarMakeModelSelector({ onAddCar, selectedCars, onRemoveCar }: CarMakeModelSelectorProps) {
  const [selectedMake, setSelectedMake] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [makeSearchTerm, setMakeSearchTerm] = useState("")
  const [modelSearchTerm, setModelSearchTerm] = useState("")
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
  const filteredModels = selectedMake
    ? getModelsForMake(selectedMake).filter((model) => model.toLowerCase().includes(modelSearchTerm.toLowerCase()))
    : []

  // Handle make selection
  const handleMakeSelect = (make: string) => {
    setSelectedMake(make)
    setMakeSearchTerm(make)
    setShowMakeDropdown(false)
    setSelectedModel("")
    setModelSearchTerm("")
  }

  // Handle model selection
  const handleModelSelect = (model: string) => {
    setSelectedModel(model)
    setModelSearchTerm(model)
    setShowModelDropdown(false)
  }

  // Handle adding a car
  const handleAddCar = () => {
    if (selectedMake && selectedModel) {
      onAddCar(selectedMake, selectedModel)
      setSelectedMake("")
      setSelectedModel("")
      setMakeSearchTerm("")
      setModelSearchTerm("")
    }
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
      {/* Selected Cars Display */}
      <div className="flex flex-wrap gap-2">
        {selectedCars.map((car, index) => (
          <div key={index} className="flex items-center gap-1 bg-[#e6eeec] text-[#294a46] px-2 py-1 rounded-md text-sm">
            <span>{`${car.make} ${car.model}`}</span>
            <button
              type="button"
              onClick={() => onRemoveCar(index)}
              className="text-[#294a46] hover:text-[#1e3632] focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Make and Model Selection */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Make Dropdown */}
        <div className="relative flex-1" ref={makeDropdownRef}>
          <div className="relative">
            <input
              type="text"
              value={makeSearchTerm}
              onChange={(e) => {
                setMakeSearchTerm(e.target.value)
                setShowMakeDropdown(true)
                if (e.target.value !== selectedMake) {
                  setSelectedMake("")
                }
              }}
              onFocus={() => setShowMakeDropdown(true)}
              placeholder="Select Make"
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {showMakeDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredMakes.length > 0 ? (
                filteredMakes.map((make) => (
                  <div
                    key={make}
                    onClick={() => handleMakeSelect(make)}
                    className={cn(
                      "px-4 py-2 cursor-pointer hover:bg-gray-100",
                      make === selectedMake && "bg-[#e6eeec]",
                    )}
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

        {/* Model Dropdown */}
        <div className="relative flex-1" ref={modelDropdownRef}>
          <div className="relative">
            <input
              type="text"
              value={modelSearchTerm}
              onChange={(e) => {
                setModelSearchTerm(e.target.value)
                setShowModelDropdown(true)
                if (e.target.value !== selectedModel) {
                  setSelectedModel("")
                }
              }}
              onFocus={() => {
                if (selectedMake) {
                  setShowModelDropdown(true)
                }
              }}
              placeholder="Select Model"
              disabled={!selectedMake}
              className={cn(
                "w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]",
                !selectedMake && "bg-gray-50 cursor-not-allowed",
              )}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {showModelDropdown && selectedMake && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => (
                  <div
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    className={cn(
                      "px-4 py-2 cursor-pointer hover:bg-gray-100",
                      model === selectedModel && "bg-[#e6eeec]",
                    )}
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

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAddCar}
          disabled={!selectedMake || !selectedModel}
          className={cn(
            "px-4 py-2 rounded-md text-white font-medium",
            selectedMake && selectedModel ? "bg-[#294a46] hover:bg-[#1e3632]" : "bg-gray-300 cursor-not-allowed",
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
