-- 🔧 FIND AND MERGE DUPLICATE USERS (PHONE + EMAIL)
-- Run this in your Supabase SQL Editor

-- 1. Show potential duplicates (same phone, different IDs)
SELECT 'Potential duplicate users (same phone, different IDs):' as info;
SELECT 
    u1.id as user1_id,
    u1.email as user1_email,
    u1.phone as phone,
    u1.created_at as user1_created,
    u2.id as user2_id,
    u2.email as user2_email,
    u2.created_at as user2_created,
    CASE 
        WHEN u1.email IS NOT NULL AND u2.email IS NOT NULL THEN 'BOTH HAVE EMAIL'
        WHEN u1.email IS NOT NULL THEN 'USER1 HAS EMAIL'
        WHEN u2.email IS NOT NULL THEN 'USER2 HAS EMAIL'
        ELSE 'NEITHER HAS EMAIL'
    END as email_status,
    CASE 
        WHEN u1.created_at < u2.created_at THEN 'USER1 OLDER (KEEP)'
        ELSE 'USER2 OLDER (KEEP)'
    END as keep_recommendation
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id  -- Different IDs
    AND u1.phone IS NOT NULL  -- Has phone
ORDER BY u1.created_at DESC
LIMIT 20;

-- 2. Count potential duplicates
SELECT 'Count of potential duplicates:' as info;
SELECT COUNT(*) as duplicate_pairs
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL;

-- 3. Show specific duplicate scenarios
SELECT 'Duplicate scenarios:' as info;
SELECT 
    'Phone-only + Email-only (same phone)' as scenario,
    COUNT(*) as count
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL 
    AND u2.email IS NOT NULL
UNION ALL
SELECT 
    'Both have email (same phone)' as scenario,
    COUNT(*) as count
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NOT NULL 
    AND u2.email IS NOT NULL
UNION ALL
SELECT 
    'Both phone-only (same phone)' as scenario,
    COUNT(*) as count
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL 
    AND u2.email IS NULL;

-- 4. Show detailed duplicate analysis
SELECT 'Detailed duplicate analysis:' as info;
SELECT 
    u1.id as phone_user_id,
    u1.phone,
    u1.email as phone_user_email,
    u1.created_at as phone_user_created,
    'FROM APPOINTMENT' as phone_user_source,
    u2.id as email_user_id,
    u2.email as email_user_email,
    u2.phone as email_user_phone,
    u2.created_at as email_user_created,
    'FROM SIGNUP' as email_user_source,
    CASE 
        WHEN u1.created_at < u2.created_at THEN u1.id
        ELSE u2.id
    END as recommended_keep_id,
    CASE 
        WHEN u1.created_at < u2.created_at THEN u2.id
        ELSE u1.id
    END as recommended_delete_id
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL  -- Phone-only user (from appointment)
    AND u2.email IS NOT NULL  -- Email user (from signup)
ORDER BY u1.created_at DESC
LIMIT 10;

-- 5. Show what happens if we merge (preview)
SELECT 'Preview - what merging would look like:' as info;
SELECT 
    'KEEP USER' as action,
    u1.id as user_id,
    u1.phone,
    COALESCE(u2.email, u1.email) as merged_email,
    u1.created_at as original_created,
    'MERGED FROM DUPLICATE' as status
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL  -- Phone-only user (from appointment)
    AND u2.email IS NOT NULL  -- Email user (from signup)
    AND u1.created_at < u2.created_at  -- Keep older user
UNION ALL
SELECT 
    'DELETE USER' as action,
    u2.id as user_id,
    u2.phone,
    u2.email,
    u2.created_at as original_created,
    'DUPLICATE - WILL BE DELETED' as status
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL  -- Phone-only user (from appointment)
    AND u2.email IS NOT NULL  -- Email user (from signup)
    AND u1.created_at < u2.created_at  -- Delete newer user
ORDER BY user_id;

-- 6. Check for foreign key constraints
SELECT 'Foreign key impact check:' as info;
SELECT 
    'Appointments referencing phone-only users' as check_type,
    COUNT(*) as count
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL
    AND u2.email IS NOT NULL
    AND u1.created_at < u2.created_at
INNER JOIN appointments a ON a.user_id = u1.id
UNION ALL
SELECT 
    'Appointments referencing email users' as check_type,
    COUNT(*) as count
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL
    AND u2.email IS NOT NULL
    AND u1.created_at < u2.created_at
INNER JOIN appointments a ON a.user_id = u2.id
UNION ALL
SELECT 
    'User profiles referencing phone-only users' as check_type,
    COUNT(*) as count
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL
    AND u2.email IS NOT NULL
    AND u1.created_at < u2.created_at
INNER JOIN user_profiles up ON up.user_id = u1.id
UNION ALL
SELECT 
    'User profiles referencing email users' as check_type,
    COUNT(*) as count
FROM users u1
INNER JOIN users u2 ON u1.phone = u2.phone 
    AND u1.id != u2.id
    AND u1.phone IS NOT NULL
    AND u1.email IS NULL
    AND u2.email IS NOT NULL
    AND u1.created_at < u2.created_at
INNER JOIN user_profiles up ON up.user_id = u2.id;

-- 7. Show merge strategy
SELECT 'Merge strategy:' as info;
SELECT 
    'Step 1: Update appointments to use kept user ID' as step,
    'Move all appointments from duplicate user to kept user' as action
UNION ALL
SELECT 
    'Step 2: Update user_profiles to use kept user ID' as step,
    'Move all profile data from duplicate user to kept user' as action
UNION ALL
SELECT 
    'Step 3: Update kept user with email from duplicate' as step,
    'Add email to kept user if it doesn\'t have one' as action
UNION ALL
SELECT 
    'Step 4: Delete duplicate user' as step,
    'Remove the duplicate user record' as action;

-- 8. Show what needs to be done
SELECT 'What needs to be done:' as info;
SELECT 
    'This is a complex merge operation' as warning,
    'Requires careful handling of foreign keys' as reason,
    'Consider using a migration script' as recommendation;

-- ✅ DONE! This shows the duplicate user problem and merge strategy. 