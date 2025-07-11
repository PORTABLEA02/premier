// Utilitaires pour la gestion de session

export const SESSION_EVENTS = {
  ACTIVITY: 'session-activity',
  WARNING: 'session-warning',
  EXPIRED: 'session-expired',
  EXTENDED: 'session-extended',
  ENDED: 'session-ended'
} as const;

export const SESSION_STORAGE_KEYS = {
  LAST_ACTIVITY: 'musaib_last_activity',
  SESSION_ID: 'musaib_session_id',
  USER_PREFERENCES: 'musaib_user_preferences',
  FORM_DRAFTS: 'musaib_form_drafts',
  NAVIGATION_HISTORY: 'musaib_navigation_history'
} as const;

export const DEFAULT_SESSION_CONFIG = {
  maxInactivityTime: 30 * 60 * 1000, // 30 minutes
  warningTime: 5 * 60 * 1000, // 5 minutes
  checkInterval: 1000, // 1 seconde
  extendOnActivity: true,
  persistSession: true,
  syncAcrossTabs: true
} as const;

// Générer un ID de session unique
export const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `session_${timestamp}_${randomPart}`;
};

// Formater le temps restant
export const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds <= 0) return '00:00';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Formater la durée de session
export const formatSessionDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

// Vérifier si une session est valide
export const isSessionValid = (lastActivity: number, maxInactivityTime: number): boolean => {
  const now = Date.now();
  const timeSinceActivity = now - lastActivity;
  return timeSinceActivity < maxInactivityTime;
};

// Calculer le temps restant avant expiration
export const getTimeRemaining = (lastActivity: number, maxInactivityTime: number): number => {
  const now = Date.now();
  const timeSinceActivity = now - lastActivity;
  return Math.max(0, maxInactivityTime - timeSinceActivity);
};

// Vérifier si l'avertissement doit être affiché
export const shouldShowWarning = (timeRemaining: number, warningTime: number): boolean => {
  return timeRemaining > 0 && timeRemaining <= warningTime;
};

// Nettoyer le stockage de session
export const clearSessionStorage = (): void => {
  Object.values(SESSION_STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Obtenir les informations de session depuis le stockage
export const getSessionFromStorage = () => {
  try {
    const lastActivity = parseInt(localStorage.getItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY) || '0');
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID);
    const preferences = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEYS.USER_PREFERENCES) || '{}');
    
    return {
      lastActivity,
      sessionId,
      preferences,
      isValid: lastActivity > 0 && sessionId !== null
    };
  } catch (error) {
    console.error('Erreur lors de la lecture du stockage de session:', error);
    return {
      lastActivity: 0,
      sessionId: null,
      preferences: {},
      isValid: false
    };
  }
};

// Sauvegarder l'activité dans le stockage
export const saveActivityToStorage = (timestamp: number = Date.now()): void => {
  localStorage.setItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY, timestamp.toString());
};

// Diffuser un événement de session à tous les onglets
export const broadcastSessionEvent = (eventType: string, data: any = {}): void => {
  const event = new CustomEvent(eventType, { detail: data });
  window.dispatchEvent(event);
  
  // Aussi utiliser le storage event pour la compatibilité
  localStorage.setItem(`temp_${eventType}`, JSON.stringify({ ...data, timestamp: Date.now() }));
  localStorage.removeItem(`temp_${eventType}`);
};

// Écouter les événements de session
export const addSessionEventListener = (
  eventType: string, 
  handler: (event: CustomEvent) => void
): (() => void) => {
  window.addEventListener(eventType, handler as EventListener);
  
  return () => {
    window.removeEventListener(eventType, handler as EventListener);
  };
};

// Détecter si l'utilisateur est actif
export const createActivityDetector = (callback: () => void): (() => void) => {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const throttledCallback = throttle(callback, 1000); // Limiter à une fois par seconde
  
  events.forEach(event => {
    document.addEventListener(event, throttledCallback, { passive: true });
  });
  
  return () => {
    events.forEach(event => {
      document.removeEventListener(event, throttledCallback);
    });
  };
};

// Fonction throttle simple
function throttle(func: Function, limit: number) {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Obtenir les statistiques de session
export const getSessionStats = () => {
  const session = getSessionFromStorage();
  if (!session.isValid) return null;
  
  const now = Date.now();
  const sessionDuration = now - session.lastActivity;
  
  return {
    sessionId: session.sessionId,
    lastActivity: new Date(session.lastActivity),
    sessionDuration,
    formattedDuration: formatSessionDuration(sessionDuration),
    isActive: isSessionValid(session.lastActivity, DEFAULT_SESSION_CONFIG.maxInactivityTime)
  };
};

// Vérifier la compatibilité du navigateur
export const checkBrowserCompatibility = (): boolean => {
  return !!(
    typeof Storage !== 'undefined' &&
    typeof CustomEvent !== 'undefined' &&
    typeof addEventListener !== 'undefined'
  );
};