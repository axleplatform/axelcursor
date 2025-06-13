'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function BookAppointment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const address = searchParams.get('address')
  const year = searchParams.get('year')
  const make = searchParams.get('make')
  const model = searchParams.get('model')
  
  const handleContinue = () => {
    router.push('/pick-mechanic?appointmentId=test123')
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Book Appointment</h1>
      <p>Address: {address || 'Not provided'}</p>
      <p>Vehicle: {year} {make} {model}</p>
      <button onClick={handleContinue}>
        Continue to Pick Mechanic
      </button>
    </div>
  )
}
