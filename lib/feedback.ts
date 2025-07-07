import { supabase } from './supabase';
import type { Feedback, CreateFeedbackRequest, FeedbackResponse } from '@/types/feedback';

export async function submitFeedback(feedback: CreateFeedbackRequest): Promise<FeedbackResponse> {
  try {
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    // Submit feedback to Supabase
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        type: feedback.type,
        message: feedback.message.trim(),
        url: feedback.url || window.location.href,
        user_id: user?.id || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting feedback:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data as Feedback
    };

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getFeedbackForUser(): Promise<Feedback[]> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      return [];
    }

    return data as Feedback[];
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return [];
  }
} 