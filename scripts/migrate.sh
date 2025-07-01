#!/bin/bash

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it first:"
    echo "brew install supabase/tap/supabase"
    exit 1
fi

# Start Supabase services
echo "Starting Supabase services..."
supabase start

# Apply migrations
echo "Applying migrations..."
supabase db reset

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "Migrations applied successfully!"
else
    echo "Error applying migrations. Please check the logs above."
    exit 1
fi

# Start the development server
echo "Starting development server..."
npm run dev
