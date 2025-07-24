-- Create safe function to check for existing accounts
-- This avoids RLS issues and provides a clean API

CREATE OR REPLACE FUNCTION check_existing_account(
  user_email TEXT,
  user_phone TEXT
) RETURNS TABLE(
  id UUID,
  email TEXT,
  phone TEXT,
  profile_status TEXT,
  account_type TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.phone,
    u.profile_status,
    u.account_type,
    u.role
  FROM users u
  WHERE (user_email != '' AND u.email = user_email)
     OR (user_phone != '' AND u.phone = user_phone)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_existing_account(TEXT, TEXT) TO authenticated, service_role;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema'; 