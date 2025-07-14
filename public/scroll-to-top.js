// Scroll to top on page navigation
(function() {
  // Store the current pathname
  let currentPathname = window.location.pathname;
  
  // Function to scroll to top
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }
  
  // Check for pathname changes
  function checkPathnameChange() {
    if (window.location.pathname !== currentPathname) {
      currentPathname = window.location.pathname;
      scrollToTop();
    }
  }
  
  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', scrollToTop);
  
  // Listen for pushstate/replacestate events
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    scrollToTop();
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    scrollToTop();
  };
  
  // Check for pathname changes periodically (fallback)
  setInterval(checkPathnameChange, 100);
  
  // Also scroll to top on initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrollToTop);
  } else {
    scrollToTop();
  }
})(); 