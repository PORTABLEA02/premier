import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  errorInfo?: any;
}

export default function ErrorFallback({ error, resetError, errorInfo }: ErrorFallbackProps) {
  const handleReload = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportError = () => {
    const errorReport = {
      message: error?.message || 'Erreur inconnue',
      stack: error?.stack || 'Pas de stack trace',
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      componentStack: errorInfo?.componentStack || 'Non disponible'
    };

    const subject = encodeURIComponent('Rapport d\'erreur MuSAIB');
    const body = encodeURIComponent(`
Bonjour,

Une erreur s'est produite dans l'application MuSAIB :

Message d'erreur: ${errorReport.message}
URL: ${errorReport.url}
Navigateur: ${errorReport.userAgent}
Heure: ${errorReport.timestamp}

Stack trace:
${errorReport.stack}

Component Stack:
${errorReport.componentStack}

Merci de corriger ce problème.
    `);

    window.open(`mailto:support@musaib.com?subject=${subject}&body=${body}`);
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Une erreur s'est produite
        </h1>
        
        <p className="text-gray-600 mb-6">
          Nous sommes désolés, mais quelque chose s'est mal passé. 
          L'erreur a été automatiquement signalée à notre équipe technique.
        </p>

        {isDevelopment && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <h3 className="text-sm font-medium text-red-900 mb-2 flex items-center">
              <Bug className="h-4 w-4 mr-2" />
              Informations de débogage
            </h3>
            <div className="text-xs text-red-700 space-y-2">
              <div>
                <strong>Message:</strong>
                <pre className="mt-1 whitespace-pre-wrap break-words">{error.message}</pre>
              </div>
              {error.stack && (
                <div>
                  <strong>Stack trace:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-xs max-h-32 overflow-y-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-xs max-h-32 overflow-y-auto">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger la page
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            <Home className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </button>

          <button
            onClick={handleReportError}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
          >
            <Mail className="h-4 w-4 mr-2" />
            Signaler le problème
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Que faire maintenant ?</h4>
          <ul className="text-sm text-blue-800 space-y-1 text-left">
            <li>• Essayez de recharger la page</li>
            <li>• Vérifiez votre connexion internet</li>
            <li>• Si le problème persiste, contactez le support</li>
            <li>• Vous pouvez aussi essayer de vider le cache de votre navigateur</li>
          </ul>
        </div>

        {error && (
          <p className="text-xs text-gray-500 mt-6">
            Référence d'erreur: {Date.now().toString(36).toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}