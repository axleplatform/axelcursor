-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('issue', 'idea')),
  message TEXT NOT NULL,
  url TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON feedback
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Allow service role to read all feedback (for admin purposes)
CREATE POLICY "Service role can read all feedback" ON feedback
  FOR SELECT USING (
    auth.role() = 'service_role'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
