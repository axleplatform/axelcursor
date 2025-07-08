"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// Mobile Feedback Form Component
function MobileFeedbackForm({ onClose }: { onClose: () => void }) {
  const [feedbackType, setFeedbackType] = useState<'issue' | 'idea' | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !feedbackType) return;
    
    try {
      setIsSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('feedback')
        .insert({
          type: feedbackType,
          message: message.trim(),
          url: window.location.href,
          user_id: user?.id || null
        });

      if (error) throw error;
      
      // Success - close modal
      onClose();
      setFeedbackType(null);
      setMessage('');
      alert('Thank you for your feedback!');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!feedbackType ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setFeedbackType('issue')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all min-h-[100px]"
            >
              <div className="text-3xl mb-3">⚠️</div>
              <span className="block text-sm font-medium">Issue</span>
            </button>
            <button
              onClick={() => setFeedbackType('idea')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#294a46] hover:bg-[#e6eeec] transition-all min-h-[100px]"
            >
              <div className="text-3xl mb-3">💡</div>
              <span className="block text-sm font-medium">Idea</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-base font-medium">
            {feedbackType === 'issue' ? 'Report an issue' : 'Share your idea'}
          </h4>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={feedbackType === 'issue' ? "Describe the issue..." : "Tell us about your idea..."}
            className="w-full h-32 p-3 border border-gray-300 rounded-md text-sm resize-none"
          />
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setFeedbackType(null)} 
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || isSubmitting}
              className="px-4 py-2 text-sm text-white bg-[#294a46] hover:bg-[#1e3632] rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Desktop Feedback Button Component
function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'issue' | 'idea' | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !feedbackType) return;
    
    try {
      setIsSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('feedback')
        .insert({
          type: feedbackType,
          message: message.trim(),
          url: window.location.href,
          user_id: user?.id || null
        });

      if (error) throw error;
      
      // Success - close modal
      setIsOpen(false);
      setFeedbackType(null);
      setMessage('');
      alert('Thank you for your feedback!');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        Feedback
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50">
          <div className="w-80 bg-white/65 backdrop-blur-[8px] rounded-md shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">What would you like to share?</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-700 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all duration-200 font-bold text-lg">
                ✕
              </button>
            </div>
            
            {!feedbackType ? (
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
            ) : (
              <div className="space-y-3">
                <h4 className="text-base font-medium">
                  {feedbackType === 'issue' ? 'Report an issue' : 'Share your idea'}
                </h4>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={feedbackType === 'issue' ? "Describe the issue..." : "Tell us about your idea..."}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md text-sm resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setFeedbackType(null)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
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
    </div>
  );
}

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close mobile menu and feedback when pathname changes (navigation occurs)
  useEffect(() => {
    setIsMenuOpen(false)
    setIsFeedbackOpen(false)
  }, [pathname])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
    setIsFeedbackOpen(false) // Close feedback when opening menu
  }

  const toggleFeedback = () => {
    setIsFeedbackOpen(!isFeedbackOpen)
    setIsMenuOpen(false) // Close menu when opening feedback
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      router.replace("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between md:relative">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/axle-logo-green.png"
              alt="Axle - Mobile Mechanic Service"
              width={80}
              height={32}
              priority
              className="h-auto"
            />
          </Link>
        </div>

        {/* Desktop Auth Buttons - Absolutely Centered */}
        <div className="hidden md:flex items-center space-x-6 absolute left-1/2 transform -translate-x-1/2">
          {isLoggedIn ? (
            <Button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm font-medium text-red-600/90 hover:text-red-700 px-3 py-2 rounded-md border border-transparent hover:border-red-200 hover:bg-red-50 transition-all duration-200"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#294a46] px-3 py-2 rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-200">
                Log In
              </Link>
              <Button asChild className="rounded-full bg-[#294a46] hover:bg-[#1e3632] text-white">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Desktop Right Side - Navigation Links + Feedback */}
        <div className="hidden md:flex items-center space-x-6 ml-auto">
          <Link
            href="/about"
            className={cn(
              "text-sm font-medium",
              isActive("/about") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
            )}
          >
            About
          </Link>
          <Link
            href="/help"
            className={cn(
              "text-sm font-medium",
              isActive("/help") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
            )}
          >
            Help
          </Link>
          <FeedbackButton />
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="p-2 text-gray-700"
          >
            {isMenuOpen ? <X size={24} /> : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 right-0 left-0 z-50">
          <div className="flex justify-end px-4">
            <div className="w-fit bg-white/65 backdrop-blur-[2px] rounded-md shadow-lg border border-gray-200 p-4">
              <nav className="space-y-4">
                {/* Sign Up and Log In buttons stacked */}
                <div className="flex flex-col space-y-2">
                  {isLoggedIn ? (
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="text-sm font-medium text-red-600/90 hover:text-red-700 px-3 py-2 rounded-md border border-red-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 text-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="text-sm font-medium text-gray-700/90 hover:text-[#294a46] px-3 py-2 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-center whitespace-nowrap"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        className="text-sm font-medium text-white bg-[#294a46] hover:bg-[#1e3632] py-2 px-4 rounded-full text-center transition-all duration-200 whitespace-nowrap"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
                
                {/* Other navigation links */}
                <div className="flex space-x-4 justify-end">
                  <Link
                    href="/about"
                    className={cn(
                      "text-sm font-medium py-2 whitespace-nowrap",
                      isActive("/about") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
                    )}
                  >
                    About
                  </Link>
                  <Link
                    href="/help"
                    className={cn(
                      "text-sm font-medium py-2 whitespace-nowrap",
                      isActive("/help") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
                    )}
                  >
                    Help
                  </Link>
                </div>
                
                {/* Feedback button for mobile */}
                <div className="flex justify-end">
                  <button
                    onClick={toggleFeedback}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Feedback
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Feedback Dropdown */}
      {isFeedbackOpen && (
        <div className="md:hidden absolute top-16 right-0 left-0 z-50">
          <div className="flex justify-end px-4">
            <div className="w-80 bg-white/65 backdrop-blur-[8px] rounded-md shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">What would you like to share?</h3>
                <button 
                  onClick={() => setIsFeedbackOpen(false)} 
                  className="text-gray-700 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all duration-200 font-bold text-lg"
                >
                  ✕
                </button>
              </div>
              
              <MobileFeedbackForm onClose={() => setIsFeedbackOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
