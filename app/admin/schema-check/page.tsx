"use client"

import { useState, useEffect } from "react"
import { examineSchema } from "@/lib/examine-schema"
import { supabase } from "@/lib/supabase"

export default function SchemaCheckPage() {
  const [schemaInfo, setSchemaInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sampleAppointment, setSampleAppointment] = useState<any>(null)

  useEffect(() => {
    async function checkSchema() {
      try {
        setLoading(true)

        // Get schema info
        const schemaResult = await examineSchema()
        setSchemaInfo(schemaResult)

        // Get a sample appointment
        const { data: appointment, error: appointmentError } = await supabase.from("appointments").select("*").limit(1)

        if (appointmentError) {
          console.error("Error fetching sample appointment:", appointmentError)
          setError("Could not fetch sample appointment")
        } else {
          setSampleAppointment(appointment && appointment.length > 0 ? appointment[0] : null)
        }
      } catch (err) {
        console.error("Error checking schema:", err)
        setError("An error occurred while checking the schema")
      } finally {
        setLoading(false)
      }
    }

    checkSchema()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Database Schema Check</h1>

      {loading && <p>Loading schema information...</p>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {schemaInfo && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Schema Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">{JSON.stringify(schemaInfo, null, 2)}</pre>
        </div>
      )}

      {sampleAppointment && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Sample Appointment</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(sampleAppointment, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
