import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, LogOut } from 'lucide-react';

interface SessionWarningProps {
  isVisible: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
  formatTime: (ms: number) => string;
}

export default function SessionWarning({ 
  isVisible, 
  timeRemaining, 
  onExtend, 
  onLogout, 
  formatTime 
}: SessionWarningProps) {
  const [isExtending, setIsExtending] = useState(false);

  const handleExtend = async () => {
    setIsExtending(true);
    onExtend();
    setTimeout(() => setIsExtending(false), 1000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Session expirée bientôt</h3>
              <p className="text-sm text-gray-600">Votre session va expirer dans</p>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-2 bg-orange-50 px-4 py-2 rounded-lg border border-orange-200">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600 font-mono">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Que se passe-t-il ?</h4>
                <p className="text-sm text-blue-800">
                  Pour votre sécurité, votre session sera automatiquement fermée après une période d'inactivité. 
                  Vous pouvez étendre votre session ou vous déconnecter maintenant.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </button>
            <button
              onClick={handleExtend}
              disabled={isExtending}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isExtending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Extension...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Étendre la session
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}