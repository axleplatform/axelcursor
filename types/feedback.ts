export interface Feedback {
  id: string;
  type: 'issue' | 'idea';
  message: string;
  url?: string;
  user_id?: string;
  created_at: string;
}

export interface CreateFeedbackRequest {
  type: 'issue' | 'idea';
  message: string;
  url?: string;
}

export interface FeedbackResponse {
  success: boolean;
  error?: string;
  data?: Feedback;
} 