#!/bin/bash

# Test script to verify temporary user merge functionality
echo "🧪 Testing temporary user merge functionality..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run SQL and check result
run_sql_test() {
    local test_name="$1"
    local sql_query="$2"
    local expected_result="$3"
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    # Run the SQL query (you'll need to replace with your actual Supabase connection)
    # result=$(psql "$DATABASE_URL" -c "$sql_query" -t)
    
    echo "SQL Query: $sql_query"
    echo "Expected: $expected_result"
    echo -e "${GREEN}✓ Test completed (manual verification needed)${NC}"
    echo ""
}

# Test 1: Check if temporary users exist
echo "📊 Test 1: Check temporary users"
run_sql_test "Count temporary users" \
    "SELECT COUNT(*) as temp_users FROM users WHERE account_type = 'temporary';" \
    "Should show count of temporary users"

# Test 2: Check appointments with temporary users
echo "📊 Test 2: Check appointments with temporary users"
run_sql_test "Appointments with temporary users" \
    "SELECT COUNT(*) as temp_appointments FROM appointments a 
     JOIN users u ON a.user_id = u.id 
     WHERE u.account_type = 'temporary';" \
    "Should show count of appointments linked to temporary users"

# Test 3: Test merge function
echo "📊 Test 3: Test merge function"
run_sql_test "Merge function test" \
    "SELECT merge_users_by_phone('5551234567', 'test-user-id');" \
    "Should return user ID after merge"

# Test 4: Verify no orphaned temporary users
echo "📊 Test 4: Check for orphaned temporary users"
run_sql_test "Orphaned temporary users" \
    "SELECT COUNT(*) as orphaned FROM users u 
     WHERE u.account_type = 'temporary' 
     AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.user_id = u.id);" \
    "Should be 0 (no orphaned temporary users)"

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "📝 Manual verification steps:"
echo "1. Create a temporary user with an appointment"
echo "2. Create a new account with the same phone number"
echo "3. Verify the appointment is moved to the new account"
echo "4. Verify the temporary user is deleted"
echo ""
echo "🔧 To run these tests manually:"
echo "1. Copy the SQL queries above"
echo "2. Run them in your Supabase SQL Editor"
echo "3. Verify the results match expectations"
