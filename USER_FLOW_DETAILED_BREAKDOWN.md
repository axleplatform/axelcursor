# 📊 **Detailed User Flow: Appointment → Account Creation**

## 🎯 **Complete Data Flow Breakdown**

### **Scenario: User books appointment, then creates account**

---

## **STEP 1: User Books Appointment (Guest Flow)** 📝

### **What Gets Created:**

#### **1. `auth.users` Table**
```sql
INSERT INTO auth.users (
  id,                    -- 'temp_uuid_123'
  email,                 -- 'temp_uuid_123@guest.axle.com'
  created_at,            -- '2024-01-15 10:30:00'
  updated_at,            -- '2024-01-15 10:30:00'
  email_confirmed_at,    -- '2024-01-15 10:30:00'
  raw_app_meta_data,     -- '{"provider": "temp", "providers": ["temp"]}'
  raw_user_meta_data,    -- '{"created_for": "guest_appointment"}'
  is_sso_user,           -- false
  role                   -- 'authenticated'
) VALUES (
  'temp_uuid_123',
  'temp_uuid_123@guest.axle.com',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "temp", "providers": ["temp"]}',
  '{"created_for": "guest_appointment"}',
  false,
  'authenticated'
);
```

#### **2. `public.users` Table**
```sql
INSERT INTO public.users (
  id,                    -- 'temp_uuid_123'
  email,                 -- 'temp_uuid_123@guest.axle.com'
  phone,                 -- NULL (no phone yet)
  account_type,          -- 'temporary'
  profile_status,        -- 'no'
  created_via,           -- 'web_guest'
  created_at,            -- '2024-01-15 10:30:00'
  updated_at             -- '2024-01-15 10:30:00'
) VALUES (
  'temp_uuid_123',
  'temp_uuid_123@guest.axle.com',
  NULL,
  'temporary',
  'no',
  'web_guest',
  NOW(),
  NOW()
);
```

#### **3. `appointments` Table**
```sql
INSERT INTO appointments (
  id,                    -- 'appointment_uuid_456'
  user_id,               -- 'temp_uuid_123' (links to temporary user)
  location,              -- '123 Main St, City, State'
  appointment_date,      -- '2024-01-20 14:00:00'
  status,                -- 'pending'
  phone_number,          -- '5551234567'
  car_runs,              -- true
  issue_description,     -- 'Engine making strange noise'
  selected_services,     -- ['{"service": "diagnostic", "description": "Engine diagnostic"}']
  created_at,            -- '2024-01-15 10:30:00'
  updated_at             -- '2024-01-15 10:30:00'
) VALUES (
  'appointment_uuid_456',
  'temp_uuid_123',
  '123 Main St, City, State',
  '2024-01-20 14:00:00',
  'pending',
  '5551234567',
  true,
  'Engine making strange noise',
  '["diagnostic"]',
  NOW(),
  NOW()
);
```

#### **4. `vehicles` Table** (if vehicle info provided)
```sql
INSERT INTO vehicles (
  id,                    -- 'vehicle_uuid_789'
  appointment_id,        -- 'appointment_uuid_456'
  year,                  -- '2020'
  make,                  -- 'Toyota'
  model,                 -- 'Camry'
  mileage,               -- 45000
  vin                    -- '1HGBH41JXMN109186'
) VALUES (
  'vehicle_uuid_789',
  'appointment_uuid_456',
  '2020',
  'Toyota',
  'Camry',
  45000,
  '1HGBH41JXMN109186'
);
```

---

## **STEP 2: User Enters Phone Number** 📱

### **What Gets Updated:**

#### **1. `public.users` Table**
```sql
UPDATE public.users 
SET 
  phone = '5551234567',
  account_type = 'phone_only',
  updated_at = NOW()
WHERE id = 'temp_uuid_123';
```

**Result:**
- `phone`: `'5551234567'` (now has phone)
- `account_type`: `'phone_only'` (upgraded from 'temporary')

---

## **STEP 3: User Creates Account** 👤

### **What Happens During Account Creation:**

#### **1. Auth Callback Detects Temporary User**
```typescript
// In auth callback
const phone = '5551234567';
const { data: tempUser } = await supabase
  .from('users')
  .select('id')
  .eq('phone', phone)
  .eq('account_type', 'phone_only')
  .single();

// Found: tempUser.id = 'temp_uuid_123'
```

#### **2. Appointments Get Moved**
```sql
UPDATE appointments 
SET 
  user_id = 'auth_uuid_999',  -- New authenticated user ID
  updated_at = NOW()
WHERE user_id = 'temp_uuid_123';  -- Old temporary user ID
```

**Result:**
- `appointment_uuid_456.user_id`: `'auth_uuid_999'` (moved to new user)

#### **3. Temporary User Gets Deleted**
```sql
DELETE FROM users WHERE id = 'temp_uuid_123';
DELETE FROM auth.users WHERE id = 'temp_uuid_123';
```

**Result:**
- Temporary user completely removed from both tables

#### **4. New User Record Created**
```sql
INSERT INTO public.users (
  id,                    -- 'auth_uuid_999'
  email,                 -- 'user@example.com'
  phone,                 -- '5551234567'
  account_type,          -- 'full'
  profile_status,        -- 'pending'
  role,                  -- 'customer'
  created_at,            -- '2024-01-15 11:00:00'
  updated_at             -- '2024-01-15 11:00:00'
) VALUES (
  'auth_uuid_999',
  'user@example.com',
  '5551234567',
  'full',
  'pending',
  'customer',
  NOW(),
  NOW()
);
```

#### **5. User Profile Created**
```sql
INSERT INTO user_profiles (
  id,                    -- 'profile_uuid_777'
  user_id,               -- 'auth_uuid_999'
  email,                 -- 'user@example.com'
  phone,                 -- '5551234567'
  onboarding_completed,  -- false
  onboarding_type,       -- 'post_appointment'
  created_at,            -- '2024-01-15 11:00:00'
  updated_at             -- '2024-01-15 11:00:00'
) VALUES (
  'profile_uuid_777',
  'auth_uuid_999',
  'user@example.com',
  '5551234567',
  false,
  'post_appointment',
  NOW(),
  NOW()
);
```

---

## **STEP 4: User Completes Onboarding** ✅

### **What Gets Updated:**

#### **1. `user_profiles` Table**
```sql
UPDATE user_profiles 
SET 
  full_name = 'John Doe',
  address = '123 Main St, City, State',
  onboarding_completed = true,
  profile_completed_at = NOW(),
  vehicles = '[{"year": "2020", "make": "Toyota", "model": "Camry"}]',
  updated_at = NOW()
WHERE user_id = 'auth_uuid_999';
```

#### **2. `public.users` Table**
```sql
UPDATE public.users 
SET 
  profile_status = 'customer',
  updated_at = NOW()
WHERE id = 'auth_uuid_999';
```

---

## **📊 FINAL STATE SUMMARY**

### **What the User Sees:**
- ✅ **Complete appointment history** in their dashboard
- ✅ **All vehicle information** preserved
- ✅ **Service history** intact
- ✅ **Phone number** linked to account
- ✅ **Email** associated with account

### **Database State:**

| Table | Record Count | Key Data |
|-------|-------------|----------|
| `auth.users` | 1 | `id: 'auth_uuid_999', email: 'user@example.com'` |
| `public.users` | 1 | `id: 'auth_uuid_999', phone: '5551234567', account_type: 'full'` |
| `user_profiles` | 1 | `user_id: 'auth_uuid_999', onboarding_completed: true` |
| `appointments` | 1 | `user_id: 'auth_uuid_999', phone_number: '5551234567'` |
| `vehicles` | 1 | `appointment_id: 'appointment_uuid_456'` |

### **What Gets Cleaned Up:**
- ❌ **Temporary user** (`temp_uuid_123`) - **DELETED**
- ❌ **Temporary auth user** (`temp_uuid_123`) - **DELETED**
- ✅ **No orphaned appointments** - All linked to new user
- ✅ **No duplicate users** - Clean consolidation

### **Data Preservation:**
- ✅ **Phone number**: `'5551234567'` - Preserved and linked
- ✅ **Email**: `'user@example.com'` - New email added
- ✅ **Appointment**: All details preserved, just moved to new user
- ✅ **Vehicle info**: All details preserved
- ✅ **Service history**: Complete history maintained

---

## **🎯 Key Benefits**

1. **Zero Data Loss**: Everything from the temporary user is preserved
2. **Clean Database**: No orphaned or duplicate records
3. **Seamless UX**: User sees complete history immediately
4. **Proper Relationships**: All foreign keys properly updated
5. **Account Types**: Clear progression from temporary → phone_only → full

The system ensures that when someone books an appointment and then creates an account, **ALL** their information is properly consolidated into a single, clean user record! 🎉 