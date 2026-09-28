import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Automatically activate new service worker and refresh when an update is available
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    console.log('Kiddies PWA ready for offline use.');
  },
  onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
    if (registration) {
      // Check for updates every 15 minutes
      setInterval(() => {
        registration.update();
      }, 15 * 60 * 1000);
    }
  }
});

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
