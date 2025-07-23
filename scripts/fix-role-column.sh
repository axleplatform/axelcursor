#!/bin/bash

# Script to fix role column in users table
echo "🔧 Fixing role column in users table..."

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
echo "📝 Running role column migration..."
psql "$DATABASE_URL" -f migrations/add_role_column_fix.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully fixed role column"
    echo "🎉 Migration completed successfully!"
else
    echo "❌ Error: Failed to fix role column"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "• Added role column to users table if missing"
echo "• Added check constraint for valid roles (customer, mechanic, anon)"
echo "• Updated existing users with appropriate roles based on profiles"
echo "• Set default role for remaining users"
echo "• Refreshed PostgREST schema cache"
echo "• Added index for performance"
echo ""
echo "🚀 Next steps:"
echo "• Test profile creation flows"
echo "• Verify role assignment works correctly"
echo "• Check that 406 errors are resolved" 