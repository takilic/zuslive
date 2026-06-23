import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully intercept and suppress cross-origin script errors and benign third-party iframe errors
if (typeof window !== 'undefined') {
  const handleBenignError = (message: string, errorObj?: any) => {
    const isScriptError = message === 'Script error.' || message.toLowerCase().includes('script error');
    const isCrossOrigin = message.toLowerCase().includes('cross-origin') || message.toLowerCase().includes('crossorigin') || message.toLowerCase().includes('cors');
    const isHlsException = message.toLowerCase().includes('hls') || (errorObj && String(errorObj).toLowerCase().includes('hls'));
    const isExtensionError = message.toLowerCase().includes('extension') || (errorObj && String(errorObj).toLowerCase().includes('chrome-extension'));
    
    return isScriptError || isCrossOrigin || isHlsException || isExtensionError;
  };

  // Set legacy window.onerror for strict suppression before event bubble
  window.onerror = function(message, source, lineno, colno, error) {
    const msg = String(message || '');
    if (handleBenignError(msg, error)) {
      console.warn('Bypassed global window.onerror script error:', msg);
      return true; // suppresses error alerts and bubbling
    }
    return false;
  };

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (handleBenignError(msg, event.error)) {
      console.warn('Silenced benign third-party or script error:', msg);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (handleBenignError(msg, reason)) {
      console.warn('Silenced benign unhandled rejection:', msg);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

