import * as React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Register Service Worker for PWA installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('ServiceWorker registered: ', reg))
      .catch((err) => console.log('ServiceWorker registration failed: ', err));
  });
}
