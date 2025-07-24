#!/bin/bash

# Deploy simplified profile system
# This eliminates complex client-side profile creation and handles existing accounts

set -e

echo "🚀 Deploying simplified profile system..."

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📋 Running migrations..."

# Run the account check function migration
echo "1️⃣ Creating account check function..."
psql "$DATABASE_URL" -f migrations/create_account_check_function.sql

# Run the automatic profile trigger migration
echo "2️⃣ Creating automatic profile trigger..."
psql "$DATABASE_URL" -f migrations/create_automatic_profile_trigger.sql

echo "✅ Simplified profile system deployed successfully!"
echo ""
echo "🎉 Benefits:"
echo "   • No more 406/409 errors"
echo "   • Automatic profile creation via database trigger"
echo "   • Existing account detection and linking"
echo "   • Simplified client-side logic"
echo ""
echo "🔧 Next steps:"
echo "   1. Test account creation on appointment confirmation page"
echo "   2. Verify existing account linking works"
echo "   3. Check that profiles are created automatically"
