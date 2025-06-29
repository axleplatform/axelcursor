import { supabase } from "./supabase"

/**
 * Normalize phone number by removing all non-digit characters
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Check if a phone number has been used before and get the associated shadow user ID
 */
export async function getExistingGuestProfile(phone: string) {
  const normalizedPhone = normalizePhone(phone)
  
  const { data, error } = await supabase
    .from('guest_profiles')
    .select('shadow_user_id, total_appointments, created_at')
    .eq('phone_normalized', normalizedPhone)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error checking existing guest profile:', error)
    return null
  }
  
  return data
}

/**
 * Create or update guest profile for phone-based tracking
 */
export async function createOrUpdateGuestProfile(
  phone: string,
  shadowUserId: string,
  appointmentId: string
) {
  const normalizedPhone = normalizePhone(phone)
  
  try {
    // Try to get existing profile first
    const existingProfile = await getExistingGuestProfile(phone)
    
    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('guest_profiles')
        .update({
          last_seen: new Date().toISOString(),
          total_appointments: supabase.raw('total_appointments + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('phone_normalized', normalizedPhone)
      
      if (error) throw error
      
      console.log('✅ Updated existing guest profile for phone:', phone)
      return existingProfile.shadow_user_id
    } else {
      // Create new profile
      const { error } = await supabase
        .from('guest_profiles')
        .insert({
          phone_normalized: normalizedPhone,
          shadow_user_id: shadowUserId,
          first_appointment_id: appointmentId,
          total_appointments: 1,
          last_seen: new Date().toISOString()
        })
      
      if (error) throw error
      
      console.log('✅ Created new guest profile for phone:', phone)
      return shadowUserId
    }
  } catch (error) {
    console.error('❌ Error managing guest profile:', error)
    // Return the provided shadow user ID as fallback
    return shadowUserId
  }
}

/**
 * Link all appointments with the same phone number to use the same shadow user ID
 */
export async function linkAppointmentsByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone)
  
  try {
    // Get all appointments with this phone number
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, user_id, created_at')
      .eq('phone_normalized', normalizedPhone)
      .order('created_at', { ascending: true })
    
    if (fetchError) throw fetchError
    
    if (appointments && appointments.length > 1) {
      // Use the first appointment's user_id as the master shadow user ID
      const masterUserId = appointments[0].user_id
      const appointmentIds = appointments.slice(1).map((a: any) => a.id)
      
      // Update all other appointments to use the same shadow user ID
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ user_id: masterUserId })
        .in('id', appointmentIds)
      
      if (updateError) throw updateError
      
      console.log('✅ Linked', appointments.length, 'appointments for phone:', phone)
      return masterUserId
    }
    
    return appointments?.[0]?.user_id || null
  } catch (error) {
    console.error('❌ Error linking appointments by phone:', error)
    return null
  }
}

/**
 * Get guest statistics for analytics
 */
export async function getGuestStats() {
  try {
    const { data, error } = await supabase
      .from('guest_profiles')
      .select('total_appointments, created_at')
    
    if (error) throw error
    
    const totalGuests = data?.length || 0
    const totalGuestAppointments = data?.reduce((sum: number, profile: any) => sum + profile.total_appointments, 0) || 0
    const returningGuests = data?.filter((profile: any) => profile.total_appointments > 1).length || 0
    
    return {
      totalGuests,
      totalGuestAppointments,
      returningGuests,
      conversionRate: totalGuests > 0 ? (returningGuests / totalGuests * 100) : 0
    }
  } catch (error) {
    console.error('❌ Error getting guest stats:', error)
    return null
  }
} 