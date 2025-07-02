#!/bin/bash

echo "🔧 Fixing deployment issues..."

echo "📦 Cleaning up dependencies..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml

echo "📦 Reinstalling dependencies..."
npm install

echo "✅ Dependencies cleaned and reinstalled!"

echo ""
echo "🗄️  Database Migration Required:"
echo "Please run the following SQL in your Supabase Dashboard → SQL Editor:"
echo ""
echo "---"
cat migrations/add_cancellation_columns_fix.sql
echo "---"
echo ""
echo "After running the migration, your deployment should work correctly."
echo ""
echo "🔍 Summary of fixes applied:"
echo "1. ✅ Updated Supabase package versions to specific versions"
echo "2. ✅ Fixed createClient import in API route"
echo "3. ✅ Created migration for missing cancellation columns"
echo ""
echo "🚀 Ready to deploy!" 