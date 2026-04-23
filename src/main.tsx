import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler
window.onerror = (message, source, lineno, colno, error) => {
  console.error("GLOBAL ERROR:", message, "at", source, ":", lineno, ":", colno, error);
};

window.onunhandledrejection = (event) => {
  // Suppress all unhandled rejections to avoid console noise from html-to-image
  event.preventDefault();
};

console.log("main.tsx execution started");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
