import React, { createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionManager } from '../hooks/useSessionManager';
import SessionWarning from '../components/SessionWarning';
import SessionExpiredModal from '../components/SessionExpiredModal';

interface SessionContextType {
  sessionState: any;
  startSession: () => void;
  endSession: (reason?: 'logout' | 'timeout' | 'manual') => void;
  extendSession: () => void;
  updateActivity: () => void;
  getSessionInfo: () => any;
  formatTime: (ms: number) => string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
  config?: {
    maxInactivityTime?: number;
    warningTime?: number;
    checkInterval?: number;
    extendOnActivity?: boolean;
  };
}

export function SessionProvider({ children, config }: SessionProviderProps) {
  const sessionManager = useSessionManager(config);
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionManager.endSession('manual');
  };

  const handleReconnect = () => {
    // Naviguer vers la page de connexion
    navigate('/login');
  };

  const handleGoHome = () => {
    navigate('/login');
  };

  return (
    <SessionContext.Provider value={sessionManager}>
      {children}
      
      {/* Avertissement de session */}
      <SessionWarning
        isVisible={sessionManager.sessionState.showWarning}
        timeRemaining={sessionManager.sessionState.timeRemaining}
        onExtend={sessionManager.extendSession}
        onLogout={handleLogout}
        formatTime={sessionManager.formatTime}
      />

      {/* Modal de session expirée */}
      <SessionExpiredModal
        isVisible={sessionManager.sessionState.isExpired}
        onReconnect={handleReconnect}
        onGoHome={handleGoHome}
      />
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}