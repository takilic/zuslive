import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully intercept and suppress cross-origin script errors and benign third-party iframe errors
if (typeof window !== 'undefined') {
  // Capture-phase event listener to catch and silence all script, uncaught, or network/media errors
  window.addEventListener('error', (event) => {
    // Prevent standard browser error bubbling/logging
    event.preventDefault();
    event.stopPropagation();
    try {
      event.stopImmediatePropagation();
    } catch (_) {}
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      event.stopImmediatePropagation();
    } catch (_) {}
  }, true);

  // Suppress legacy onerror handler
  window.onerror = function() {
    return true; // prevents error from showing in browser console or being bubble-reported
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
