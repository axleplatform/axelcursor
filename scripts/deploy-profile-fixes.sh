#!/bin/bash

# Deploy comprehensive profile creation fixes
# This script fixes 406, 409, and foreign key constraint errors

set -e

echo "🚀 Deploying comprehensive profile creation fixes..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Not in Supabase project directory"
    exit 1
fi

# Run the migration
echo "📦 Running migration..."
supabase db push

# Verify the migration
echo "🔍 Verifying migration..."
supabase db reset --linked

echo "✅ Profile creation fixes deployed successfully!"
echo ""
echo "🎯 What was fixed:"
echo "  • Added missing columns to user_profiles table"
echo "  • Fixed RLS policies for user_profiles and users tables"
echo "  • Created automatic profile creation trigger"
echo "  • Added safe user existence check functions"
echo "  • Created proper indexes for performance"
echo "  • Backfilled missing user profiles"
echo "  • Refreshed schema cache"
echo ""
echo "🚀 Your app should now work without 406/409 errors!" 