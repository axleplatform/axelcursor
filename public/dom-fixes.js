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
  
  // Override removeChild to prevent Google Maps errors
  Node.prototype.removeChild = function(child) {
    try {
      if (child && child.parentNode === this) {
        return originalRemoveChild.call(this, child);
      }
    } catch (error) {
      console.debug('RemoveChild error caught:', error);
    }
    return child;
  };
  
  // Override appendChild to prevent Google Maps autocomplete issues
  Node.prototype.appendChild = function(child) {
    try {
      // Special handling for Google Places Autocomplete elements
      if (child && typeof child.className === 'string' && child.className.includes('pac-')) {
        // Ensure the element can be safely appended
        if (!child.parentNode || child.parentNode !== this) {
          return originalAppendChild.call(this, child);
        }
      } else {
        return originalAppendChild.call(this, child);
      }
    } catch (error) {
      console.debug('AppendChild error caught:', error);
    }
    return child;
  };
})(); 