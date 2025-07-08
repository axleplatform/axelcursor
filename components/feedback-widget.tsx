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
        <div className="fixed inset-0 z-50 flex justify-center" style={{ paddingTop: '4rem' }}>
          <div className="w-fit bg-white/65 backdrop-blur-[2px] rounded-md shadow-lg border border-gray-200 p-4 max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">What would you like to share?</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>
            
            {/* Type selection */}
            {!feedbackType && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFeedbackType('issue')}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all min-h-[80px]"
                  >
                    <div className="text-2xl mb-2">⚠️</div>
                    <span className="block text-sm font-medium">Issue</span>
                  </button>
                  
                  <button
                    onClick={() => setFeedbackType('idea')}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#294a46] hover:bg-[#e6eeec] transition-all min-h-[80px]"
                  >
                    <div className="text-2xl mb-2">💡</div>
                    <span className="block text-sm font-medium">Idea</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Feedback form */}
            {feedbackType && (
              <div className="space-y-3">
                <h4 className="text-base font-medium">
                  {feedbackType === 'issue' ? 'Report an issue' : 'Share your idea'}
                </h4>
                
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={feedbackType === 'issue' 
                    ? "Describe the issue you're experiencing..." 
                    : "Tell us about your idea..."}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md text-sm resize-none"
                />
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setFeedbackType(null)}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    className="px-3 py-2 text-sm text-white bg-[#294a46] hover:bg-[#1e3632] rounded-md disabled:opacity-50"
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
