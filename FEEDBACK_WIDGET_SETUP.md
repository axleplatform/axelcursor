# Feedback Widget Setup

This document explains how to set up and use the feedback widget that has been added to the site header.

## Components Created

1. **`components/feedback-widget.tsx`** - The main feedback widget component
2. **`lib/feedback.ts`** - Utility functions for handling feedback submissions
3. **`types/feedback.ts`** - TypeScript type definitions
4. **`migrations/create_feedback_table.sql`** - Database migration for the feedback table
5. **`supabase/migrations/20250101000000_create_feedback_table.sql`** - Supabase migration file

## Database Setup

### Option 1: Using Supabase CLI

1. Run the migration using Supabase CLI:
\`\`\`bash
supabase db push
\`\`\`

### Option 2: Manual SQL Execution

1. Connect to your Supabase database
2. Execute the SQL from `supabase/migrations/20250101000000_create_feedback_table.sql`

### Option 3: Using the Script

1. Make the script executable:
\`\`\`bash
chmod +x scripts/create-feedback-table.sh
\`\`\`

2. Run the script:
\`\`\`bash
./scripts/create-feedback-table.sh
\`\`\`

## Features

### Feedback Types
- **Issue** - For reporting bugs or problems
- **Idea** - For suggesting new features or improvements

### User Experience
- Modal interface with two-step process
- Type selection with visual icons
- Text area for detailed feedback
- Success/error notifications
- Responsive design for mobile and desktop

### Data Collection
- Feedback type (issue/idea)
- User message
- Current URL (for context)
- User ID (if logged in)
- Timestamp

## Security

The feedback table includes Row Level Security (RLS) policies:
- Users can only insert their own feedback
- Users can only view their own feedback
- Service role can read all feedback (for admin purposes)

## Usage

The feedback widget is automatically included in the site header and appears on all pages. Users can:

1. Click the "Feedback" button in the header
2. Choose between "Issue" or "Idea"
3. Enter their feedback message
4. Submit the feedback

## Admin Access

To view all feedback submissions, you can query the database with the service role:

\`\`\`sql
SELECT * FROM feedback ORDER BY created_at DESC;
\`\`\`

## Customization

### Styling
The widget uses Tailwind CSS classes and can be customized by modifying the classes in `components/feedback-widget.tsx`.

### Icons
The widget currently uses emoji icons (⚠️ for issues, 💡 for ideas). You can replace these with Lucide React icons if needed.

### Feedback Types
To add more feedback types, update:
1. The `feedbackType` state type in the component
2. The database table constraint
3. The TypeScript types

## Troubleshooting

### Linter Errors
If you see TypeScript linter errors related to React or JSX, these are likely configuration issues and don't affect functionality.

### Database Connection
Ensure your Supabase connection is properly configured in `lib/supabase.ts`.

### RLS Policies
If users can't submit feedback, check that the RLS policies are correctly applied to the feedback table.
