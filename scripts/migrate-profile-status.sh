#!/bin/bash

# Script to add profile_status column to users table
echo "🔄 Adding profile_status column to users table..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Run the migration
echo "📝 Running profile_status column migration..."
psql "$DATABASE_URL" -f migrations/add_profile_status_column.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully added profile_status column"
    echo "🎉 Migration completed successfully!"
else
    echo "❌ Error: Failed to add profile_status column"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "• Added profile_status column to users table"
echo "• Set up automatic triggers for profile status updates"
echo "• Updated existing users based on their profile types"
echo "• Added index for performance"
echo ""
echo "🚀 Next steps:"
echo "• Deploy the updated codebase"
echo "• Test account creation flows"
echo "• Verify profile status updates work correctly"
