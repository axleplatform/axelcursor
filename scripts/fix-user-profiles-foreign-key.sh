#!/bin/bash

# Script to fix user_profiles foreign key constraint issue
echo "🔧 Fixing user_profiles foreign key constraint issue..."

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
echo "📝 Running foreign key fix migration..."
psql "$DATABASE_URL" -f migrations/fix_user_profiles_foreign_key.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully fixed user_profiles foreign key constraint"
    echo "🎉 Migration completed successfully!"
else
    echo "❌ Error: Failed to fix user_profiles foreign key constraint"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "• Identified problematic foreign key constraint on user_profiles.id"
echo "• Dropped user_profiles_id_fkey constraint"
echo "• Ensured user_id foreign key constraint is correct"
echo "• Refreshed PostgREST schema cache"
echo "• Verified table structure"
echo ""
echo "🚀 Next steps:"
echo "• Test profile creation flows"
echo "• Verify 409 errors are resolved"
echo "• Test user profile creation on appointment confirmation page"
echo "• Check that foreign key constraints are working correctly" 