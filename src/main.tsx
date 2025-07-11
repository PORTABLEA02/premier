import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gestion des erreurs globales
window.addEventListener('unhandledrejection', (event) => {
  console.error('Erreur non gérée:', event.reason);
  // En production, vous pourriez envoyer ces erreurs à un service de monitoring
});

window.addEventListener('error', (event) => {
  console.error('Erreur JavaScript:', event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
