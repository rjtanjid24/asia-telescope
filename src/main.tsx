import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent noisy unhandleable external cross-origin script loads from crashing preview/iframe
window.onerror = function (message, url, line, col, error) {
  const msgStr = String(message || "");
  if (msgStr.includes("Script error") || msgStr.includes("cross-origin") || !message) {
    console.warn("Caught and handled cross-origin stream/script error gracefully (window.onerror):", msgStr);
    return true; // Prevents the firing of the global uncaught error event
  }
  return false;
};

window.addEventListener("error", (event) => {
  const msgStr = String(event.message || "");
  if (msgStr.includes("Script error") || msgStr.includes("cross-origin") || !event.message) {
    console.warn("Caught and handled cross-origin stream/script error gracefully (addEventListener):", msgStr);
    event.stopPropagation();
    event.preventDefault();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
