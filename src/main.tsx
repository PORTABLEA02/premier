import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger, setupGlobalErrorHandling } from './utils/logger';
import ErrorBoundary from './components/ErrorBoundary';

// Initialiser le système de journalisation
setupGlobalErrorHandling();
logger.info('system', 'Application MuSAIB démarrée', {
  version: '1.0.0',
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
