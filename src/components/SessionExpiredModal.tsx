import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface SessionExpiredModalProps {
  isVisible: boolean;
  onReconnect: () => void;
  onGoHome?: () => void;
}

export default function SessionExpiredModal({ isVisible, onReconnect, onGoHome }: SessionExpiredModalProps) {
  const handleReconnect = () => {
    onReconnect();
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      // Fallback: recharger la page pour retourner à l'accueil
      window.location.href = '/login';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200">
        <div className="p-6 text-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session expirée</h2>
          <p className="text-gray-600 mb-6">
            Votre session a expiré pour des raisons de sécurité. 
            Veuillez vous reconnecter pour continuer.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-sm font-medium text-amber-900 mb-1">Pourquoi ma session a-t-elle expiré ?</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Inactivité prolongée (plus de 30 minutes)</li>
                  <li>• Mesure de sécurité automatique</li>
                  <li>• Protection de vos données personnelles</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleReconnect}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Se reconnecter
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}