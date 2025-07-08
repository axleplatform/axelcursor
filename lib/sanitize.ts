import React from 'react';

export function sanitizeForJSX(content: any): string {
  if (!content) return '';
  
  // Convert to string and escape HTML entities
  return String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function SafeText({ children }: { children: any }) {
  return <>{sanitizeForJSX(children)}</>;
}
