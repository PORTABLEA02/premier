import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { AppError } from '../utils/errorHandler';

interface ErrorNotificationProps {
  maxErrors?: number;
  autoHideDelay?: number;
}

interface ErrorDisplay {
  id: string;
  type: string;
  message: string;
  code?: string;
  timestamp: Date;
  dismissed: boolean;
}

export default function ErrorNotification({ 
  maxErrors = 3, 
  autoHideDelay = 5000 
}: ErrorNotificationProps) {
  const [errors, setErrors] = useState<ErrorDisplay[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Écouter les erreurs de l'application
    const handleAppError = (event: CustomEvent) => {
      const { type, message, code } = event.detail;
      
      const newError: ErrorDisplay = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        message,
        code,
        timestamp: new Date(),
        dismissed: false
      };

      setErrors(prev => {
        const updated = [newError, ...prev].slice(0, maxErrors);
        return updated;
      });

      // Auto-hide après délai
      if (autoHideDelay > 0) {
        setTimeout(() => {
          dismissError(newError.id);
        }, autoHideDelay);
      }
    };

    // Écouter les changements de connectivité
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Écouter le mode hors ligne
    const handleAppOffline = (event: CustomEvent) => {
      setIsOnline(false);
    };

    window.addEventListener('app-error', handleAppError as EventListener);
    window.addEventListener('app-offline', handleAppOffline as EventListener);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('app-error', handleAppError as EventListener);
      window.removeEventListener('app-offline', handleAppOffline as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [maxErrors, autoHideDelay]);

  const dismissError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const dismissAllErrors = () => {
    setErrors([]);
  };

  const retryConnection = () => {
    window.location.reload();
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'NETWORK_ERROR':
        return <WifiOff className="h-5 w-5" />;
      case 'AUTHENTICATION_ERROR':
      case 'AUTHORIZATION_ERROR':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'NETWORK_ERROR':
        return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'AUTHENTICATION_ERROR':
      case 'AUTHORIZATION_ERROR':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'VALIDATION_ERROR':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'SERVER_ERROR':
      case 'FIREBASE_ERROR':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
      {/* Indicateur de connectivité */}
      {!isOnline && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <WifiOff className="h-5 w-5 text-red-500 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Hors ligne</h4>
                <p className="text-sm text-red-700">Connexion internet perdue</p>
              </div>
            </div>
            <button
              onClick={retryConnection}
              className="ml-4 p-1 text-red-600 hover:text-red-800 transition-colors duration-200"
              title="Réessayer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Erreurs */}
      {errors.map((error) => (
        <div
          key={error.id}
          className={`border-l-4 p-4 rounded-lg shadow-lg transition-all duration-300 ${getErrorColor(error.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 mt-0.5">
                {getErrorIcon(error.type)}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-1">
                  {error.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                <p className="text-sm">{error.message}</p>
                {error.code && (
                  <p className="text-xs mt-1 opacity-75">Code: {error.code}</p>
                )}
                <p className="text-xs mt-1 opacity-75">
                  {error.timestamp.toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
            <button
              onClick={() => dismissError(error.id)}
              className="ml-4 flex-shrink-0 text-current hover:opacity-75 transition-opacity duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Bouton pour effacer toutes les erreurs */}
      {errors.length > 1 && (
        <div className="text-center">
          <button
            onClick={dismissAllErrors}
            className="text-xs text-gray-600 hover:text-gray-800 bg-white px-3 py-1 rounded-full shadow border border-gray-200 transition-colors duration-200"
          >
            Effacer toutes les notifications
          </button>
        </div>
      )}
    </div>
  );
}