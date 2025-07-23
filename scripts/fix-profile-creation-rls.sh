#!/bin/bash

# Script to fix profile creation RLS and constraints
echo "🔧 Fixing profile creation RLS and constraints..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it to your Supabase database URL"
    exit 1
fi

# Run the migration
echo "📝 Running profile creation RLS and constraints migration..."
psql "$DATABASE_URL" -f migrations/fix_profile_creation_rls_and_constraints.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully fixed profile creation RLS and constraints"
    echo "🎉 Migration completed successfully!"
else
    echo "❌ Error: Failed to fix profile creation RLS and constraints"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "• Added missing columns to users table (profile_status, account_type, phone, role)"
echo "• Created user_profiles table with proper structure"
echo "• Set up comprehensive RLS policies for all tables"
echo "• Created automatic triggers for profile status updates"
echo "• Added user merging function for phone number matching"
echo "• Updated existing users with correct profile_status"
echo "• Added proper permissions and indexes"
echo ""
echo "🚀 Next steps:"
echo "• Test profile creation flows"
echo "• Verify RLS policies work correctly"
echo "• Test account linking functionality"
echo "• Verify triggers update profile_status automatically" 