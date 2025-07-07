#!/bin/bash

# Script to create feedback table in Supabase

echo "Creating feedback table in Supabase..."

# Run the migration
psql "$DATABASE_URL" -f migrations/create_feedback_table.sql

echo "Feedback table created successfully!"
echo "You can now use the feedback widget in the site header." 