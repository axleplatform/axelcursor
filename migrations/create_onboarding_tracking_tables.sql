-- Create onboarding tracking tables for different user types
-- These tables track user progress through onboarding flows

-- Customer onboarding tracking table
CREATE TABLE IF NOT EXISTS customer_onboarding_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    highest_step_reached INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL,
    current_step_name TEXT,
    current_step_original_number INTEGER,
    time_on_last_step_seconds INTEGER,
    total_time_seconds INTEGER,
    user_agent TEXT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    dropped_off BOOLEAN DEFAULT FALSE,
    drop_off_step INTEGER,
    drop_off_step_name TEXT,
    drop_off_page TEXT,
    drop_off_original_step_number INTEGER,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post-appointment onboarding tracking table
CREATE TABLE IF NOT EXISTS post_appointment_onboarding_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    highest_step_reached INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL,
    current_step_name TEXT,
    current_step_original_number INTEGER,
    time_on_last_step_seconds INTEGER,
    total_time_seconds INTEGER,
    user_agent TEXT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    dropped_off BOOLEAN DEFAULT FALSE,
    drop_off_step INTEGER,
    drop_off_step_name TEXT,
    drop_off_page TEXT,
    drop_off_original_step_number INTEGER,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mechanic onboarding tracking table
CREATE TABLE IF NOT EXISTS mechanic_onboarding_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    highest_step_reached INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL,
    current_step_name TEXT,
    time_on_last_step_seconds INTEGER,
    total_time_seconds INTEGER,
    user_agent TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    dropped_off BOOLEAN DEFAULT FALSE,
    drop_off_step INTEGER,
    drop_off_step_name TEXT,
    drop_off_page TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_onboarding_tracking_session_id ON customer_onboarding_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_customer_onboarding_tracking_user_id ON customer_onboarding_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_onboarding_tracking_appointment_id ON customer_onboarding_tracking(appointment_id);

CREATE INDEX IF NOT EXISTS idx_post_appointment_onboarding_tracking_session_id ON post_appointment_onboarding_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_post_appointment_onboarding_tracking_user_id ON post_appointment_onboarding_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_post_appointment_onboarding_tracking_appointment_id ON post_appointment_onboarding_tracking(appointment_id);

CREATE INDEX IF NOT EXISTS idx_mechanic_onboarding_tracking_session_id ON mechanic_onboarding_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_onboarding_tracking_user_id ON mechanic_onboarding_tracking(user_id);

-- Enable Row Level Security
ALTER TABLE customer_onboarding_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_appointment_onboarding_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_onboarding_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_onboarding_tracking
-- Allow authenticated users to view their own records
CREATE POLICY "Users can view their own customer onboarding tracking" ON customer_onboarding_tracking
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Allow authenticated users to insert their own records
CREATE POLICY "Users can insert their own customer onboarding tracking" ON customer_onboarding_tracking
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to update their own records
CREATE POLICY "Users can update their own customer onboarding tracking" ON customer_onboarding_tracking
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow anonymous users to insert records (for unauthenticated onboarding)
CREATE POLICY "Anonymous users can insert customer onboarding tracking" ON customer_onboarding_tracking
    FOR INSERT TO anon
    WITH CHECK (user_id IS NULL);

-- Allow anonymous users to update records by session_id (for unauthenticated onboarding)
CREATE POLICY "Anonymous users can update customer onboarding tracking by session" ON customer_onboarding_tracking
    FOR UPDATE TO anon
    USING (user_id IS NULL)
    WITH CHECK (user_id IS NULL);

-- RLS Policies for post_appointment_onboarding_tracking
CREATE POLICY "Users can view their own post-appointment onboarding tracking" ON post_appointment_onboarding_tracking
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own post-appointment onboarding tracking" ON post_appointment_onboarding_tracking
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own post-appointment onboarding tracking" ON post_appointment_onboarding_tracking
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous users can insert post-appointment onboarding tracking" ON post_appointment_onboarding_tracking
    FOR INSERT TO anon
    WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous users can update post-appointment onboarding tracking by session" ON post_appointment_onboarding_tracking
    FOR UPDATE TO anon
    USING (user_id IS NULL)
    WITH CHECK (user_id IS NULL);

-- RLS Policies for mechanic_onboarding_tracking
CREATE POLICY "Users can view their own mechanic onboarding tracking" ON mechanic_onboarding_tracking
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own mechanic onboarding tracking" ON mechanic_onboarding_tracking
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mechanic onboarding tracking" ON mechanic_onboarding_tracking
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous users can insert mechanic onboarding tracking" ON mechanic_onboarding_tracking
    FOR INSERT TO anon
    WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous users can update mechanic onboarding tracking by session" ON mechanic_onboarding_tracking
    FOR UPDATE TO anon
    USING (user_id IS NULL)
    WITH CHECK (user_id IS NULL);

-- Add comments for documentation
COMMENT ON TABLE customer_onboarding_tracking IS 'Tracks customer progress through the 20-step onboarding flow';
COMMENT ON TABLE post_appointment_onboarding_tracking IS 'Tracks customer progress through post-appointment onboarding';
COMMENT ON TABLE mechanic_onboarding_tracking IS 'Tracks mechanic progress through onboarding';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema'; 