import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'password_change' | 'data_access' | 'file_upload' | 'suspicious_activity';
  userId?: string;
  details: any;
  timestamp: Date;
  userAgent: string;
  ip?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);

  // Enregistrer un événement de sécurité
  const logSecurityEvent = useCallback(async (event: Omit<SecurityEvent, 'timestamp' | 'userAgent'>) => {
    if (!isMonitoring) return;

    try {
      const securityEvent: SecurityEvent = {
        ...event,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        ip: await getUserIP()
      };

      // Enregistrer dans Firestore
      await addDoc(collection(db, 'securityLogs'), {
        ...securityEvent,
        timestamp: securityEvent.timestamp.toISOString()
      });

      // Vérifier si l'événement nécessite une alerte
      checkForSecurityAlerts(securityEvent);

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'événement de sécurité:', error);
    }
  }, [isMonitoring]);

  // Obtenir l'adresse IP de l'utilisateur
  const getUserIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  };

  // Vérifier les alertes de sécurité
  const checkForSecurityAlerts = (event: SecurityEvent) => {
    const newAlerts: SecurityAlert[] = [];

    // Détection de tentatives de connexion multiples
    if (event.type === 'login_failure') {
      const recentFailures = getRecentEvents('login_failure', 15 * 60 * 1000); // 15 minutes
      if (recentFailures.length >= 5) {
        newAlerts.push({
          id: generateAlertId(),
          message: `Tentatives de connexion multiples détectées pour l'utilisateur ${event.details.email}`,
          severity: 'high',
          timestamp: new Date(),
          acknowledged: false
        });
      }
    }

    // Détection de connexion depuis une nouvelle localisation
    if (event.type === 'login_success' && event.ip) {
      const previousLogins = getRecentEvents('login_success', 30 * 24 * 60 * 60 * 1000); // 30 jours
      const knownIPs = previousLogins.map(login => login.ip).filter(Boolean);
      
      if (!knownIPs.includes(event.ip)) {
        newAlerts.push({
          id: generateAlertId(),
          message: `Connexion depuis une nouvelle adresse IP: ${event.ip}`,
          severity: 'medium',
          timestamp: new Date(),
          acknowledged: false
        });
      }
    }

    // Détection d'activité suspecte
    if (event.type === 'suspicious_activity') {
      newAlerts.push({
        id: generateAlertId(),
        message: `Activité suspecte détectée: ${event.details.description}`,
        severity: event.severity,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Ajouter les nouvelles alertes
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
    }
  };

  // Obtenir les événements récents (simulation - en production, interroger la base de données)
  const getRecentEvents = (type: string, timeWindow: number): SecurityEvent[] => {
    // En production, ceci ferait une requête à la base de données
    // Pour l'instant, on retourne un tableau vide
    return [];
  };

  // Générer un ID unique pour les alertes
  const generateAlertId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Marquer une alerte comme acquittée
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);

  // Effacer toutes les alertes
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Détecter les tentatives d'accès non autorisé
  const detectUnauthorizedAccess = useCallback((resource: string, action: string) => {
    if (!user) {
      logSecurityEvent({
        type: 'suspicious_activity',
        details: {
          description: `Tentative d'accès non authentifié à ${resource}`,
          action,
          resource
        },
        severity: 'high'
      });
      return false;
    }

    // Vérifier les permissions
    const hasPermission = checkUserPermission(user.role, resource, action);
    if (!hasPermission) {
      logSecurityEvent({
        type: 'suspicious_activity',
        userId: user.id,
        details: {
          description: `Tentative d'accès non autorisé à ${resource}`,
          action,
          resource,
          userRole: user.role
        },
        severity: 'high'
      });
      return false;
    }

    return true;
  }, [user, logSecurityEvent]);

  // Vérifier les permissions utilisateur
  const checkUserPermission = (role: string, resource: string, action: string): boolean => {
    const permissions = {
      admin: {
        users: ['read', 'write', 'delete'],
        services: ['read', 'write', 'delete'],
        requests: ['read', 'write', 'approve', 'reject'],
        reports: ['read', 'write']
      },
      member: {
        profile: ['read', 'write'],
        family: ['read', 'write'],
        requests: ['read', 'write'],
        services: ['read']
      }
    };

    return permissions[role]?.[resource]?.includes(action) || false;
  };

  // Surveiller les changements de session
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent({
          type: 'data_access',
          userId: user?.id,
          details: { action: 'page_hidden' },
          severity: 'low'
        });
      }
    };

    const handleBeforeUnload = () => {
      logSecurityEvent({
        type: 'data_access',
        userId: user?.id,
        details: { action: 'page_unload' },
        severity: 'low'
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, logSecurityEvent]);

  // Surveiller les tentatives de manipulation du DOM
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Détecter l'injection de scripts
              if (element.tagName === 'SCRIPT' || element.innerHTML.includes('<script')) {
                logSecurityEvent({
                  type: 'suspicious_activity',
                  userId: user?.id,
                  details: {
                    description: 'Tentative d\'injection de script détectée',
                    element: element.outerHTML.substring(0, 100)
                  },
                  severity: 'critical'
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [user, logSecurityEvent]);

  return {
    logSecurityEvent,
    alerts,
    acknowledgeAlert,
    clearAlerts,
    detectUnauthorizedAccess,
    isMonitoring,
    setIsMonitoring
  };
};