// Système de journalisation centralisé pour MuSAIB
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory = 'auth' | 'user' | 'request' | 'system' | 'security' | 'performance' | 'business';

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  timestamp: Date;
  sessionId?: string;
  userAgent: string;
  url: string;
  ip?: string;
  stackTrace?: string;
  correlationId?: string;
}

class Logger {
  private sessionId: string;
  private userId?: string;
  private userEmail?: string;
  private userRole?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Définir l'utilisateur actuel pour les logs
  setUser(userId: string, email: string, role: string) {
    this.userId = userId;
    this.userEmail = email;
    this.userRole = role;
  }

  // Nettoyer l'utilisateur (déconnexion)
  clearUser() {
    this.userId = undefined;
    this.userEmail = undefined;
    this.userRole = undefined;
  }

  // Masquer les données sensibles
  private sanitizeData(data: any): any {
    // Gérer les cas null/undefined
    if (data === undefined || data === null) {
      return 'NA';
    }
    
    if (typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'nip', 'bankAccount', 
      'mobileNumber', 'ssn', 'creditCard', 'pin', 'userId', 'uid', 'id'
    ];

    const sanitizeRecursive = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeRecursive(item));
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '***MASKED***';
          } else {
            result[key] = sanitizeRecursive(value);
          }
        }
        return result;
      }
      
      return obj;
    }
    
    return sanitizeRecursive(data);
  }


  // Méthode principale de logging
  private async log(level: LogLevel, category: LogCategory, message: string, details?: any, error?: Error) {
    try {
      const logEntry: LogEntry = {
        level,
        category,
        message,
        details: this.sanitizeData(details) || 'NA',
        userId: '***MASKED***',
        userEmail: this.userEmail || 'NA',
        userRole: this.userRole || 'NA',
        timestamp: new Date(),
        sessionId: this.sessionId || 'NA',
        userAgent: navigator.userAgent,
        url: window.location.href,
        ip: 'NA',
        stackTrace: error?.stack || 'NA',
        correlationId: this.generateCorrelationId()
      };


      // Sauvegarder dans Firestore
      await addDoc(collection(db, 'logs'), {
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString()
      });

      // Pour les erreurs critiques, envoyer une alerte
      if (level === 'critical') {
        this.sendCriticalAlert(logEntry);
      }

    } catch (loggingError) {
      // Fallback silencieux si le logging échoue
      // Les erreurs de logging ne sont plus affichées dans la console
    }
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private async sendCriticalAlert(logEntry: LogEntry) {
    try {
      // Envoyer une notification aux administrateurs
      await addDoc(collection(db, 'notifications'), {
        title: 'Alerte Critique Système',
        message: `Erreur critique détectée: ${logEntry.message}`,
        type: 'error',
        level: 'critical',
        userId: 'system',
        targetRole: 'admin',
        read: false,
        createdAt: new Date().toISOString(),
        details: logEntry
      });
    } catch (error) {
      console.error('Impossible d\'envoyer l\'alerte critique:', error);
    }
  }

  // Méthodes publiques pour différents niveaux
  debug(category: LogCategory, message: string, details?: any) {
    return this.log('debug', category, message, details);
  }

  info(category: LogCategory, message: string, details?: any) {
    return this.log('info', category, message, details);
  }

  warn(category: LogCategory, message: string, details?: any) {
    return this.log('warn', category, message, details);
  }

  error(category: LogCategory, message: string, details?: any, error?: Error) {
    return this.log('error', category, message, details, error);
  }

  critical(category: LogCategory, message: string, details?: any, error?: Error) {
    return this.log('critical', category, message, details, error);
  }

  // Méthodes spécialisées pour les événements métier
  logUserAction(action: string, details?: any) {
    return this.info('user', `Action utilisateur: ${action}`, details);
  }

  logAuthEvent(event: string, details?: any) {
    return this.info('auth', `Événement d'authentification: ${event}`, details);
  }

  logSecurityEvent(event: string, details?: any) {
    return this.warn('security', `Événement de sécurité: ${event}`, details);
  }

  logBusinessEvent(event: string, details?: any) {
    return this.info('business', `Événement métier: ${event}`, details);
  }

  logPerformance(metric: string, value: number, details?: any) {
    return this.info('performance', `Métrique de performance: ${metric}`, { value, ...details });
  }

  // Méthode pour capturer les erreurs JavaScript globales
  captureError(error: Error, context?: string) {
    return this.error('system', `Erreur JavaScript${context ? ` (${context})` : ''}`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context
    }, error);
  }
}

// Instance singleton du logger
export const logger = new Logger();

// Hook pour capturer les erreurs globales
export const setupGlobalErrorHandling = () => {
  // Erreurs JavaScript non gérées
  window.addEventListener('error', (event) => {
    event.preventDefault(); // Empêcher l'affichage de l'erreur dans la console
    logger.captureError(event.error, 'Global Error Handler');
  });

  // Promesses rejetées non gérées
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault(); // Empêcher l'affichage de l'erreur dans la console
    logger.error('system', 'Promise rejetée non gérée', {
      reason: event.reason,
      promise: event.promise
    });
  });
};

// Utilitaires pour mesurer les performances
export const performanceLogger = {
  startTimer: (name: string) => {
    const startTime = performance.now();
    return {
      end: (details?: any) => {
        const duration = performance.now() - startTime;
        logger.logPerformance(name, duration, details);
        return duration;
      }
    };
  },

  measureAsync: async <T>(name: string, fn: () => Promise<T>, details?: any): Promise<T> => {
    const timer = performanceLogger.startTimer(name);
    try {
      const result = await fn();
      timer.end({ ...details, success: true });
      return result;
    } catch (error) {
      timer.end({ ...details, success: false, error: error.message });
      throw error;
    }
  }
};

export default logger;