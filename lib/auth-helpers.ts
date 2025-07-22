import { supabase } from './supabase';

export async function getUserRoleAndRedirect(router: any) {
  
  try {
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      router.push('/login');
      return null;
    }

    // Check if user is a mechanic
    const { data: mechanic } = await supabase
      .from('mechanic_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Return appropriate dashboard route
    if (mechanic) {
      return '/mechanic/dashboard';
    } else {
      return '/customer-dashboard';
    }
  } catch (error) {
    return '/customer-dashboard'; // Default to customer
  }
}

export async function redirectToCorrectDashboard(router: any) {
  const dashboardRoute = await getUserRoleAndRedirect(router);
  if (dashboardRoute) {
    router.push(dashboardRoute);
  }
}
