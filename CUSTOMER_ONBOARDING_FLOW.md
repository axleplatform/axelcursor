# Customer Onboarding Flow

## Overview
A comprehensive 20-step onboarding flow for new customers that collects vehicle information, preferences, and account details before creating their account.

## Key Features
- **20-step guided flow** with progress indicator
- **Google Auth at step 14** (not at the beginning)
- **localStorage data persistence** for pre-auth data
- **Multi-step form** with validation
- **Emoji-based UI** for better user experience

## Flow Steps

### Pre-Auth Steps (1-13)
1. **Vehicle Information** - Collect year, make, model, VIN, mileage, license plate
2. **Referral Source** - How did they find us (Google, App Store, etc.)
3. **Previous Apps** - Have they used other car service apps
4. **Why Axle is Better** - Show benefits and cost savings
5. **Last Service** - Previous service details (date, type, cost, mileage)
6. **Thank You** - Acknowledgment step
7. **Axle AI Benefits** - Detailed feature overview
8. **Location** - City or zip code
9. **Notifications** - Opt-in for reminders
10. **Add Another Vehicle** - Additional vehicles
11. **Maintenance Schedule** - Personalized schedule preview
12. **Setting Up** - Loading/configuration step
13. **Plan Ready** - Show personalized maintenance plan

### Auth Step (14)
14. **Create Account** - Google OAuth or email signup

### Post-Auth Steps (15-20)
15. **Phone Number** - Contact information
16. **Free Trial** - 30-day trial offer
17. **Choose Plan** - Basic vs Premium selection
18. **Limited Offer** - Special discount promotion
19. **Success** - Welcome message
20. **Dashboard** - Redirect to main app

## Technical Implementation

### Data Flow
1. **Pre-auth data** stored in localStorage
2. **Google Auth** at step 14
3. **Data transfer** via API call after auth
4. **Database update** with all collected information

### Database Schema
New columns added to `users` table:
- `vehicles` (JSONB) - Array of vehicle objects
- `referral_source` (TEXT) - How user found platform
- `last_service` (JSONB) - Previous service details
- `notifications_enabled` (BOOLEAN) - Notification preferences
- `subscription_plan` (TEXT) - User's plan
- `subscription_status` (TEXT) - Active/inactive/trial
- `free_trial_ends_at` (TIMESTAMP) - Trial expiration
- `onboarding_completed` (BOOLEAN) - Flow completion status
- `onboarding_data` (JSONB) - Complete flow data

### API Endpoints
- `POST /api/onboarding/complete` - Save onboarding data after auth

### Files Created/Modified
- `app/onboarding/customer/flow/page.tsx` - Main flow component
- `app/api/onboarding/complete/route.ts` - Data completion API
- `app/auth/callback/route.ts` - Updated for onboarding flow
- `migrations/add_onboarding_columns.sql` - Database schema updates
- `app/onboarding/customer/signup/page.tsx` - Added flow link

## Usage
1. Navigate to `/onboarding/customer/flow`
2. Complete steps 1-13 (data stored in localStorage)
3. Authenticate at step 14 (Google OAuth)
4. Complete steps 15-20
5. Data automatically saved to database
6. Redirected to dashboard

## Benefits
- **Better conversion** - Collect data before asking for account
- **Reduced friction** - Google Auth not required upfront
- **Comprehensive data** - 20 steps capture detailed information
- **User-friendly** - Progress indicator and emoji UI
- **Data persistence** - No data loss during auth process 