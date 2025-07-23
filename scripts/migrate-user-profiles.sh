#!/bin/bash

# Script to create user_profiles table for customer accounts
echo "🔄 Creating user_profiles table for customer accounts..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Run the migration
echo "📝 Running user_profiles table migration..."
psql "$DATABASE_URL" -f migrations/create_user_profiles_table.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully created user_profiles table"
    echo "🎉 Migration completed successfully!"
else
    echo "❌ Error: Failed to create user_profiles table"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "• Created user_profiles table for customer accounts"
echo "• Added indexes for performance"
echo "• Set up RLS policies"
echo "• Mechanics continue using mechanic_profiles table"
echo ""
echo "🚀 Next steps:"
echo "• Deploy the updated codebase"
echo "• Test customer account creation flows"
echo "• Verify dashboard access controls"
