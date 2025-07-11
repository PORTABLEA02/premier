import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      setRetryCount(0);
      
      // Notifier l'application du retour en ligne
      window.dispatchEvent(new CustomEvent('app-online'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      
      // Notifier l'application du passage hors ligne
      window.dispatchEvent(new CustomEvent('app-offline'));
    };

    // Écouter les événements de connectivité
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérification périodique de la connectivité
    const checkConnectivity = async () => {
      try {
        const response = await fetch('/ping', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (!isOnline && response.ok) {
          handleOnline();
        }
      } catch (error) {
        if (isOnline) {
          handleOffline();
        }
      }
    };

    const interval = setInterval(checkConnectivity, 30000); // Vérifier toutes les 30 secondes

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    
    try {
      // Tenter de recharger la page ou de reconnecter
      const response = await fetch('/', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      // La connexion n'est pas encore rétablie
      setTimeout(() => {
        if (retryCount < 3) {
          handleRetry();
        }
      }, 2000);
    }
  };

  if (!showOfflineMessage && isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Barre de statut hors ligne */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span>Connexion internet perdue</span>
            <button
              onClick={handleRetry}
              className="ml-4 px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-xs transition-colors duration-200"
              disabled={retryCount >= 3}
            >
              {retryCount >= 3 ? 'Limite atteinte' : 'Réessayer'}
            </button>
          </div>
        </div>
      )}

      {/* Notification de reconnexion */}
      {isOnline && showOfflineMessage && (
        <div className="bg-green-600 text-white px-4 py-2 text-center text-sm animate-slide-down">
          <div className="flex items-center justify-center space-x-2">
            <Wifi className="h-4 w-4" />
            <span>Connexion rétablie</span>
          </div>
        </div>
      )}

      {/* Mode dégradé */}
      {!isOnline && (
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center justify-center space-x-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <div className="text-sm">
              <p className="font-medium">Mode hors ligne activé</p>
              <p className="text-xs">Certaines fonctionnalités peuvent être limitées</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}