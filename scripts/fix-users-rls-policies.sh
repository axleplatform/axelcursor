#!/bin/bash

# Script to fix RLS policies on users table
echo "🔧 Fixing RLS policies on users table..."

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
echo "📝 Running RLS policy fix migration..."
psql "$DATABASE_URL" -f migrations/fix_users_table_rls_policies.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully fixed RLS policies on users table"
    echo "🎉 Migration completed successfully!"
else
    echo "❌ Error: Failed to fix RLS policies"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "• Fixed RLS policies on users table"
echo "• Added proper permissions for authenticated users"
echo "• Created safe functions for checking user existence"
echo "• Added anonymous access for signup flow"
echo "• Refreshed PostgREST schema cache"
echo ""
echo "🚀 Next steps:"
echo "• Test signup flows"
echo "• Verify 406 errors are resolved"
echo "• Test user profile creation"
echo "• Check that RLS policies work correctly"
