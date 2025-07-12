import React, { useState } from 'react';
import { Clock, Wifi, WifiOff, User, Settings } from 'lucide-react';
import { useSessionManager } from '../hooks/useSessionManager';

export default function SessionStatus() {
  const { sessionState, getSessionInfo, extendSession } = useSessionManager();
  const [showDetails, setShowDetails] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null; // Masquer en production ou rendre plus discret
  }

  const sessionInfo = getSessionInfo();

  const getStatusColor = () => {
    if (!sessionState.isActive) return 'text-red-500';
    if (sessionState.showWarning) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!sessionState.isActive) return <WifiOff className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!sessionState.isActive) return 'Session inactive';
    if (sessionState.showWarning) return 'Session expire bientôt';
    return 'Session active';
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
      <div 
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
          {sessionState.isActive && (
            <span className="text-xs text-gray-500 font-mono">
              {sessionInfo.timeRemainingFormatted}
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="border-t border-gray-200 p-3 space-y-2">
          <div className="text-xs text-gray-600">
            <div className="flex justify-between">
              <span>ID Session:</span>
              <span className="font-mono">{sessionInfo.sessionId?.slice(-8) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Dernière activité:</span>
              <span>{sessionInfo.lastActivity.toLocaleTimeString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Temps restant:</span>
              <span className="font-mono">{sessionInfo.timeRemainingFormatted}</span>
            </div>
          </div>
          
          {sessionState.isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                extendSession();
              }}
              className="w-full text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors duration-200"
            >
              Étendre la session
            </button>
          )}
        </div>
      )}
    </div>
  );
}