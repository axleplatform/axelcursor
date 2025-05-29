const fetchAppointments = async () => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        users:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .order('appointment_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to include user information
    const transformedAppointments = appointments.map(appointment => ({
      ...appointment,
      is_guest: appointment.users?.raw_user_meta_data?.is_anonymous || false,
      user_email: appointment.users?.email || 'Anonymous User'
    }));

    setAppointments(transformedAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    toast.error('Failed to fetch appointments');
  }
};

// Update the appointment card to show user information
const AppointmentCard = ({ appointment }) => {
  const isGuest = appointment.users?.raw_user_meta_data?.is_anonymous || false;
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>
          {isGuest ? 'Guest Appointment' : 'User Appointment'}
        </CardTitle>
        <CardDescription>
          {appointment.users?.email || 'Anonymous User'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Rest of the appointment card content */}
      </CardContent>
    </Card>
  );
}; 