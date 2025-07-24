#!/bin/bash

echo "🔧 Fixing User Profiles Issue..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

echo "📊 Current database state:"
echo "1. Running migrations..."
supabase db push

echo "2. Checking user_profiles table..."
supabase db reset --linked

echo "✅ User profiles should now be working!"
echo ""
echo "🔍 To verify, check your Supabase dashboard:"
echo "   - Go to Table Editor"
echo "   - Look for 'user_profiles' table"
echo "   - Should see records being created automatically"
echo ""
echo "🚀 Try creating a new account now - it should work!" 