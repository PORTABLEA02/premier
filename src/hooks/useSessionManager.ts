import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface SessionConfig {
  maxInactivityTime: number; // en millisecondes
  warningTime: number; // temps avant expiration pour afficher l'avertissement
  checkInterval: number; // intervalle de vérification
  extendOnActivity: boolean; // étendre la session sur activité
}

interface SessionState {
  isActive: boolean;
  lastActivity: number;
  timeRemaining: number;
  showWarning: boolean;
  isExpired: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  maxInactivityTime: 30 * 60 * 1000, // 30 minutes
  warningTime: 5 * 60 * 1000, // 5 minutes avant expiration
  checkInterval: 1000, // vérification chaque seconde
  extendOnActivity: true
};

const STORAGE_KEYS = {
  LAST_ACTIVITY: 'musaib_last_activity',
  SESSION_ID: 'musaib_session_id',
  USER_PREFERENCES: 'musaib_user_preferences'
};

export const useSessionManager = (config: Partial<SessionConfig> = {}) => {
  const { user, logout } = useAuth();
  const sessionConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    lastActivity: Date.now(),
    timeRemaining: sessionConfig.maxInactivityTime,
    showWarning: false,
    isExpired: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Générer un ID de session unique
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Mettre à jour l'activité
  const updateActivity = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
    
    setSessionState(prev => ({
      ...prev,
      lastActivity: now,
      timeRemaining: sessionConfig.maxInactivityTime,
      showWarning: false,
      isExpired: false
    }));

    // Diffuser l'activité aux autres onglets
    window.dispatchEvent(new CustomEvent('session-activity', { 
      detail: { timestamp: now, sessionId: sessionIdRef.current } 
    }));
  }, [sessionConfig.maxInactivityTime]);

  // Démarrer une nouvelle session
  const startSession = useCallback(() => {
    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    
    updateActivity();
    
    setSessionState(prev => ({
      ...prev,
      isActive: true,
      isExpired: false
    }));

    console.log('🟢 Session démarrée:', sessionId);
  }, [generateSessionId, updateActivity]);

  // Terminer la session
  const endSession = useCallback(async (reason: 'logout' | 'timeout' | 'manual' = 'manual') => {
    console.log('🔴 Session terminée:', reason);
    
    // Nettoyer les timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    // Nettoyer le stockage local
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    
    setSessionState({
      isActive: false,
      lastActivity: 0,
      timeRemaining: 0,
      showWarning: false,
      isExpired: reason === 'timeout'
    });

    // Déconnecter l'utilisateur si nécessaire
    if (reason === 'timeout' && user) {
      await logout();
    }

    // Notifier les autres onglets
    window.dispatchEvent(new CustomEvent('session-ended', { 
      detail: { reason, sessionId: sessionIdRef.current } 
    }));
    
    sessionIdRef.current = null;
  }, [user, logout]);

  // Étendre la session
  const extendSession = useCallback(() => {
    updateActivity();
    console.log('⏰ Session étendue');
  }, [updateActivity]);

  // Vérifier l'état de la session
  const checkSessionStatus = useCallback(() => {
    if (!user || !sessionState.isActive) return;

    const now = Date.now();
    const lastActivity = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) || '0');
    const timeSinceActivity = now - lastActivity;
    const timeRemaining = sessionConfig.maxInactivityTime - timeSinceActivity;

    setSessionState(prev => ({
      ...prev,
      timeRemaining: Math.max(0, timeRemaining),
      lastActivity
    }));

    // Afficher l'avertissement
    if (timeRemaining <= sessionConfig.warningTime && timeRemaining > 0 && !sessionState.showWarning) {
      setSessionState(prev => ({ ...prev, showWarning: true }));
      console.log('⚠️ Avertissement de session - Expiration dans:', Math.ceil(timeRemaining / 1000), 'secondes');
    }

    // Session expirée
    if (timeRemaining <= 0) {
      endSession('timeout');
    }
  }, [user, sessionState.isActive, sessionState.showWarning, sessionConfig.maxInactivityTime, sessionConfig.warningTime, endSession]);

  // Gestionnaires d'événements pour détecter l'activité
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const handleUserActivity = useCallback(() => {
    if (sessionConfig.extendOnActivity && sessionState.isActive) {
      updateActivity();
    }
  }, [sessionConfig.extendOnActivity, sessionState.isActive, updateActivity]);

  // Gestionnaire pour la synchronisation entre onglets
  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.LAST_ACTIVITY && event.newValue) {
      const newActivity = parseInt(event.newValue);
      setSessionState(prev => ({
        ...prev,
        lastActivity: newActivity,
        timeRemaining: sessionConfig.maxInactivityTime - (Date.now() - newActivity),
        showWarning: false
      }));
    }
  }, [sessionConfig.maxInactivityTime]);

  // Gestionnaire pour les événements personnalisés entre onglets
  const handleCustomEvents = useCallback((event: CustomEvent) => {
    switch (event.type) {
      case 'session-activity':
        if (event.detail.sessionId !== sessionIdRef.current) {
          const { timestamp } = event.detail;
          setSessionState(prev => ({
            ...prev,
            lastActivity: timestamp,
            timeRemaining: sessionConfig.maxInactivityTime - (Date.now() - timestamp),
            showWarning: false
          }));
        }
        break;
      case 'session-ended':
        if (event.detail.sessionId !== sessionIdRef.current) {
          endSession(event.detail.reason);
        }
        break;
    }
  }, [sessionConfig.maxInactivityTime, endSession]);

  // Gestionnaire de visibilité de la page
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      console.log('📱 Page cachée - Session en pause');
    } else {
      console.log('📱 Page visible - Session reprise');
      if (sessionConfig.extendOnActivity && sessionState.isActive) {
        updateActivity();
      }
    }
  }, [sessionConfig.extendOnActivity, sessionState.isActive, updateActivity]);

  // Gestionnaire de fermeture de fenêtre
  const handleBeforeUnload = useCallback(() => {
    // Sauvegarder l'état avant fermeture
    if (sessionState.isActive) {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    }
  }, [sessionState.isActive]);

  // Initialisation et nettoyage
  useEffect(() => {
    if (user && !sessionState.isActive) {
      startSession();
    } else if (!user && sessionState.isActive) {
      endSession('logout');
    }
  }, [user, sessionState.isActive, startSession, endSession]);

  // Configuration des événements et timers
  useEffect(() => {
    if (!sessionState.isActive) return;

    // Timer principal de vérification
    intervalRef.current = setInterval(checkSessionStatus, sessionConfig.checkInterval);

    // Événements d'activité utilisateur
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Événements de synchronisation
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('session-activity', handleCustomEvents as EventListener);
    window.addEventListener('session-ended', handleCustomEvents as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Surveillance des changements d'authentification Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && sessionState.isActive) {
        endSession('logout');
      }
    });

    return () => {
      // Nettoyage
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });

      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('session-activity', handleCustomEvents as EventListener);
      window.removeEventListener('session-ended', handleCustomEvents as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      unsubscribeAuth();
    };
  }, [
    sessionState.isActive,
    sessionConfig.checkInterval,
    checkSessionStatus,
    handleUserActivity,
    handleStorageChange,
    handleCustomEvents,
    handleVisibilityChange,
    handleBeforeUnload,
    endSession
  ]);

  // Fonctions utilitaires
  const getSessionInfo = useCallback(() => {
    return {
      sessionId: sessionIdRef.current,
      isActive: sessionState.isActive,
      lastActivity: new Date(sessionState.lastActivity),
      timeRemaining: sessionState.timeRemaining,
      timeRemainingFormatted: formatTime(sessionState.timeRemaining),
      showWarning: sessionState.showWarning,
      isExpired: sessionState.isExpired
    };
  }, [sessionState]);

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    sessionState,
    startSession,
    endSession,
    extendSession,
    updateActivity,
    getSessionInfo,
    formatTime: (ms: number) => formatTime(ms)
  };
};