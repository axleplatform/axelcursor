"use client"

import { useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { submitFeedback } from '@/lib/feedback';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'issue' | 'idea' | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async () => {
    if (!message.trim() || !feedbackType) return;
    
    try {
      setIsSubmitting(true);
      
      const result = await submitFeedback({
        type: feedbackType,
        message: message.trim(),
        url: window.location.href
      });

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to submit feedback. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Success
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });
      
      // Reset and close
      setIsOpen(false);
      setFeedbackType(null);
      setMessage('');
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      {/* Feedback button in header */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        Feedback
      </button>
      
      {/* Feedback modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">What would you like to share?</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Type selection */}
            {!feedbackType && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFeedbackType('issue')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group"
                  >
                    <div className="text-3xl mb-2">⚠️</div>
                    <span className="block text-sm font-medium group-hover:text-red-700">Issue</span>
                  </button>
                  
                  <button
                    onClick={() => setFeedbackType('idea')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="text-3xl mb-2">💡</div>
                    <span className="block text-sm font-medium group-hover:text-green-700">Idea</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Feedback form */}
            {feedbackType && (
              <div className="p-6">
                <div className="mb-4">
                  <button
                    onClick={() => setFeedbackType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                </div>
                
                <h4 className="text-lg font-medium mb-2">
                  {feedbackType === 'issue' ? 'Report an issue' : 'Share your idea'}
                </h4>
                
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={feedbackType === 'issue' 
                    ? "Describe the issue you're experiencing..." 
                    : "Tell us about your idea..."}
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
                
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 