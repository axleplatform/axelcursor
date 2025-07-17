// DOM fixes for Google Maps compatibility
(function() {
  'use strict';
  
  if (typeof window === 'undefined') return;
  
  // Monaco Editor worker fix
  window.MonacoEnvironment = {
    getWorkerUrl: function() {
      return '/monaco-editor-worker.js';
    }
  };
  
  // Store original methods
  const originalRemoveChild = Node.prototype.removeChild;
  const originalAppendChild = Node.prototype.appendChild;
  const originalInsertBefore = Node.prototype.insertBefore;
  
  // Track DOM operations to prevent conflicts
  let isProcessingDOM = false;
  let pendingOperations = [];
  
  // Safe DOM operation wrapper
  function safeDOMOperation(operation) {
    if (isProcessingDOM) {
      pendingOperations.push(operation);
      return;
    }
    
    isProcessingDOM = true;
    try {
      operation();
    } catch (error) {
      console.debug('DOM operation error caught:', error);
    } finally {
      isProcessingDOM = false;
      
      // Process pending operations
      if (pendingOperations.length > 0) {
        const nextOperation = pendingOperations.shift();
        setTimeout(() => safeDOMOperation(nextOperation), 10);
      }
    }
  }
  
  // Override removeChild to prevent Google Maps errors
  Node.prototype.removeChild = function(child) {
    return safeDOMOperation(() => {
      if (child && child.parentNode === this) {
        return originalRemoveChild.call(this, child);
      }
      return child;
    });
  };
  
  // Override appendChild to prevent Google Maps autocomplete issues
  Node.prototype.appendChild = function(child) {
    return safeDOMOperation(() => {
      // Special handling for Google Places Autocomplete elements
      if (child && typeof child.className === 'string' && child.className.includes('pac-')) {
        // Ensure the element can be safely appended
        if (!child.parentNode || child.parentNode !== this) {
          return originalAppendChild.call(this, child);
        }
      } else {
        return originalAppendChild.call(this, child);
      }
      return child;
    });
  };
  
  // Override insertBefore to prevent Google Maps issues
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    return safeDOMOperation(() => {
      try {
        return originalInsertBefore.call(this, newNode, referenceNode);
      } catch (error) {
        console.debug('InsertBefore error caught:', error);
        return newNode;
      }
    });
  };
  
  // Add cleanup function to window for manual cleanup
  window.cleanupGoogleMapsDOM = function() {
    try {
      const selectors = [
        '.pac-container',
        '.pac-item',
        '.google-maps-autocomplete-suggestions',
        '[data-google-maps-autocomplete]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          try {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          } catch (error) {
            // Ignore cleanup errors
          }
        });
      });
    } catch (error) {
      console.debug('Cleanup error:', error);
    }
  };
  
  // Listen for page visibility changes to cleanup on navigation
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      // Page is being hidden (navigation starting)
      setTimeout(() => {
        if (document.hidden) {
          window.cleanupGoogleMapsDOM();
        }
      }, 100);
    }
  });
  
  // Listen for beforeunload to cleanup
  window.addEventListener('beforeunload', function() {
    window.cleanupGoogleMapsDOM();
  });
})();
