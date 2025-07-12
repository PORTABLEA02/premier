import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SessionData {
  userId: string;
  loginTime: number;
  lastActivity: number;
  preferences: UserPreferences;
  navigationHistory: string[];
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  autoSave: boolean;
  sessionTimeout: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'fr',
  notifications: true,
  autoSave: true,
  sessionTimeout: 30 * 60 * 1000 // 30 minutes
};

const STORAGE_KEYS = {
  SESSION_DATA: 'musaib_session_data',
  USER_PREFERENCES: 'musaib_user_preferences',
  NAVIGATION_HISTORY: 'musaib_navigation_history',
  FORM_DRAFTS: 'musaib_form_drafts'
};

export const useSessionPersistence = () => {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données de session
  const loadSessionData = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      if (stored) {
        const data = JSON.parse(stored) as SessionData;
        setSessionData(data);
      }

      const storedPrefs = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (storedPrefs) {
        const prefs = JSON.parse(storedPrefs) as UserPreferences;
        setPreferences({ ...DEFAULT_PREFERENCES, ...prefs });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sauvegarder les données de session
  const saveSessionData = useCallback((data: Partial<SessionData>) => {
    try {
      const currentData = sessionData || {
        userId: user?.id || '',
        loginTime: Date.now(),
        lastActivity: Date.now(),
        preferences: DEFAULT_PREFERENCES,
        navigationHistory: []
      };

      const updatedData = { ...currentData, ...data };
      setSessionData(updatedData);
      localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données de session:', error);
    }
  }, [sessionData, user]);

  // Sauvegarder les préférences utilisateur
  const savePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updatedPreferences));
      
      // Mettre à jour aussi dans les données de session
      saveSessionData({ preferences: updatedPreferences });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
    }
  }, [preferences, saveSessionData]);

  // Ajouter une page à l'historique de navigation
  const addToNavigationHistory = useCallback((path: string) => {
    if (!sessionData) return;

    const history = [...(sessionData.navigationHistory || [])];
    
    // Éviter les doublons consécutifs
    if (history[history.length - 1] !== path) {
      history.push(path);
      
      // Limiter l'historique à 50 entrées
      if (history.length > 50) {
        history.shift();
      }
      
      saveSessionData({ navigationHistory: history });
    }
  }, [sessionData, saveSessionData]);

  // Sauvegarder un brouillon de formulaire
  const saveDraft = useCallback((formId: string, data: any) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORM_DRAFTS) || '{}');
      drafts[formId] = {
        data,
        timestamp: Date.now(),
        userId: user?.id
      };
      localStorage.setItem(STORAGE_KEYS.FORM_DRAFTS, JSON.stringify(drafts));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du brouillon:', error);
    }
  }, [user]);

  // Charger un brouillon de formulaire
  const loadDraft = useCallback((formId: string) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORM_DRAFTS) || '{}');
      const draft = drafts[formId];
      
      if (draft && draft.userId === user?.id) {
        // Vérifier que le brouillon n'est pas trop ancien (24h)
        const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          return draft.data;
        } else {
          // Supprimer le brouillon expiré
          delete drafts[formId];
          localStorage.setItem(STORAGE_KEYS.FORM_DRAFTS, JSON.stringify(drafts));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du brouillon:', error);
    }
    return null;
  }, [user]);

  // Supprimer un brouillon
  const deleteDraft = useCallback((formId: string) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORM_DRAFTS) || '{}');
      delete drafts[formId];
      localStorage.setItem(STORAGE_KEYS.FORM_DRAFTS, JSON.stringify(drafts));
    } catch (error) {
      console.error('Erreur lors de la suppression du brouillon:', error);
    }
  }, []);

  // Nettoyer les données de session
  const clearSessionData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
      localStorage.removeItem(STORAGE_KEYS.NAVIGATION_HISTORY);
      // Garder les préférences utilisateur
      setSessionData(null);
    } catch (error) {
      console.error('Erreur lors du nettoyage des données de session:', error);
    }
  }, []);

  // Nettoyer tous les brouillons expirés
  const cleanupExpiredDrafts = useCallback(() => {
    try {
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORM_DRAFTS) || '{}');
      const now = Date.now();
      const cleanedDrafts: any = {};
      
      Object.entries(drafts).forEach(([formId, draft]: [string, any]) => {
        const isRecent = now - draft.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          cleanedDrafts[formId] = draft;
        }
      });
      
      localStorage.setItem(STORAGE_KEYS.FORM_DRAFTS, JSON.stringify(cleanedDrafts));
    } catch (error) {
      console.error('Erreur lors du nettoyage des brouillons:', error);
    }
  }, []);

  // Obtenir les statistiques de session
  const getSessionStats = useCallback(() => {
    if (!sessionData) return null;

    const now = Date.now();
    const sessionDuration = now - sessionData.loginTime;
    const timeSinceActivity = now - sessionData.lastActivity;

    return {
      sessionDuration,
      timeSinceActivity,
      pagesVisited: sessionData.navigationHistory?.length || 0,
      loginTime: new Date(sessionData.loginTime),
      lastActivity: new Date(sessionData.lastActivity),
      formattedDuration: formatDuration(sessionDuration),
      formattedInactivity: formatDuration(timeSinceActivity)
    };
  }, [sessionData]);

  // Formater une durée en texte lisible
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Initialisation
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Créer une nouvelle session quand l'utilisateur se connecte
  useEffect(() => {
    if (user && !sessionData) {
      saveSessionData({
        userId: user.id,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        preferences,
        navigationHistory: []
      });
    } else if (!user && sessionData) {
      clearSessionData();
    }
  }, [user, sessionData, preferences, saveSessionData, clearSessionData]);

  // Nettoyage périodique des brouillons expirés
  useEffect(() => {
    const cleanup = () => cleanupExpiredDrafts();
    cleanup(); // Nettoyage initial
    
    const interval = setInterval(cleanup, 60 * 60 * 1000); // Toutes les heures
    return () => clearInterval(interval);
  }, [cleanupExpiredDrafts]);

  return {
    sessionData,
    preferences,
    isLoading,
    saveSessionData,
    savePreferences,
    addToNavigationHistory,
    saveDraft,
    loadDraft,
    deleteDraft,
    clearSessionData,
    getSessionStats,
    formatDuration
  };
};