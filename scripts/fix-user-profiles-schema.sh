#!/bin/bash

# Script to fix user_profiles table schema
echo "🔧 Fixing user_profiles table schema..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
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
echo "📝 Running user_profiles schema fix migration..."
psql "$DATABASE_URL" -f migrations/ensure_user_profiles_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully fixed user_profiles table schema"
    echo "🎉 Migration completed successfully!"
else
    echo "❌ Error: Failed to fix user_profiles table schema"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "• Added missing columns to user_profiles table"
echo "• Set default values for existing records"
echo "• Refreshed PostgREST schema cache"
echo "• Verified schema integrity"
echo ""
echo "🚀 Next steps:"
echo "• Test profile creation flows"
echo "• Verify 400 errors are resolved"
echo "• Test user profile updates"
echo "• Check that all columns exist and work correctly" 