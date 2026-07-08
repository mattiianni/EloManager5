
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './hooks/useAuth.tsx';
import AuthGate from './components/auth/AuthGate.tsx';
import './index.css';

declare const __APP_BUILD_ID__: string;

// In development we want immediate UI feedback without stale cached bundles.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

if (import.meta.env.PROD) {
  const BUILD_KEY = 'padel_elo_build_id';
  const currentBuildId = __APP_BUILD_ID__;
  const previousBuildId = localStorage.getItem(BUILD_KEY);

  if (previousBuildId && previousBuildId !== currentBuildId) {
    Promise.all([
      navigator.serviceWorker.getRegistrations().then(registrations =>
        Promise.all(registrations.map(registration => registration.unregister()))
      ),
      ('caches' in window)
        ? caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
        : Promise.resolve(),
    ]).finally(() => {
      localStorage.setItem(BUILD_KEY, currentBuildId);
      window.location.reload();
    });
  } else {
    localStorage.setItem(BUILD_KEY, currentBuildId);
  }

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      const checkUpdate = () => {
        registration.update().catch(console.error);
      };

      // Controlla gli aggiornamenti ogni 60 secondi
      setInterval(checkUpdate, 60 * 1000);

      // Controlla gli aggiornamenti quando l'app torna in primo piano
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkUpdate();
        }
      });

      // Ricarica la pagina quando il nuovo service worker prende il controllo
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </React.StrictMode>
);
