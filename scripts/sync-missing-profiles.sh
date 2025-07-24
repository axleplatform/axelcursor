#!/bin/bash

# Script to sync missing user profiles
echo "🔄 Syncing missing user profiles..."

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

# Run the sync migration
echo "📝 Running sync migration for missing user profiles..."
psql "$DATABASE_URL" -f migrations/sync_missing_user_profiles.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully synced missing user profiles"
    echo "🎉 Sync completed successfully!"
else
    echo "❌ Error: Failed to sync missing user profiles"
    exit 1
fi

echo ""
echo "📋 Summary of sync:"
echo "• Identified users missing profiles"
echo "• Created user_profiles for missing users"
echo "• Set appropriate onboarding_type based on account_type"
echo "• Verified sync completion"
echo ""
echo "🚀 Next steps:"
echo "• Check that all users now have profiles"
echo "• Verify onboarding_type is set correctly"
echo "• Test the appointment confirmation flow"
echo "• Ensure new users get profiles created properly" 