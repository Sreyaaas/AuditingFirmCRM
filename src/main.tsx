import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker with automatic background updates
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('[PWA] New version ready, updating in background.');
  },
  onOfflineReady() {
    console.info('[PWA] Shameer & Associates CRM is cached and ready offline.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
