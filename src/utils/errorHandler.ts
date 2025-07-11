// Système centralisé de gestion des erreurs pour MuSAIB
import { logger } from './logger';

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'SERVER_ERROR'
  | 'FIREBASE_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  userMessage?: string;
  originalError?: Error;
  context?: any;
}

export class CustomError extends Error implements AppError {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  userMessage?: string;
  originalError?: Error;
  context?: any;

  constructor(
    type: ErrorType,
    message: string,
    userMessage?: string,
    code?: string,
    statusCode?: number,
    originalError?: Error,
    context?: any
  ) {
    super(message);
    this.name = 'CustomError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
    this.originalError = originalError;
    this.context = context;
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case 'NETWORK_ERROR':
        return 'Problème de connexion réseau. Vérifiez votre connexion internet.';
      case 'AUTHENTICATION_ERROR':
        return 'Erreur d\'authentification. Veuillez vous reconnecter.';
      case 'AUTHORIZATION_ERROR':
        return 'Vous n\'avez pas les permissions nécessaires pour cette action.';
      case 'VALIDATION_ERROR':
        return 'Les données saisies ne sont pas valides.';
      case 'NOT_FOUND_ERROR':
        return 'La ressource demandée n\'a pas été trouvée.';
      case 'SERVER_ERROR':
        return 'Erreur du serveur. Veuillez réessayer plus tard.';
      case 'FIREBASE_ERROR':
        return 'Erreur de service. Veuillez réessayer.';
      default:
        return 'Une erreur inattendue s\'est produite.';
    }
  }
}

// Factory pour créer des erreurs typées
export const ErrorFactory = {
  network: (message: string, originalError?: Error, context?: any) =>
    new CustomError('NETWORK_ERROR', message, undefined, 'NETWORK', 0, originalError, context),

  authentication: (message: string, code?: string, originalError?: Error) =>
    new CustomError('AUTHENTICATION_ERROR', message, undefined, code, 401, originalError),

  authorization: (message: string, context?: any) =>
    new CustomError('AUTHORIZATION_ERROR', message, undefined, 'FORBIDDEN', 403, undefined, context),

  validation: (message: string, userMessage?: string, context?: any) =>
    new CustomError('VALIDATION_ERROR', message, userMessage, 'VALIDATION', 400, undefined, context),

  notFound: (resource: string, id?: string) =>
    new CustomError('NOT_FOUND_ERROR', `${resource} not found${id ? ` (ID: ${id})` : ''}`, 
      `${resource} introuvable`, 'NOT_FOUND', 404),

  server: (message: string, originalError?: Error, context?: any) =>
    new CustomError('SERVER_ERROR', message, undefined, 'SERVER', 500, originalError, context),

  firebase: (code: string, message: string, originalError?: Error) =>
    new CustomError('FIREBASE_ERROR', message, undefined, code, 500, originalError),

  unknown: (message: string, originalError?: Error, context?: any) =>
    new CustomError('UNKNOWN_ERROR', message, undefined, 'UNKNOWN', 500, originalError, context)
};

// Gestionnaire global d'erreurs
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorQueue: AppError[] = [];
  private isProcessing = false;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  // Traiter une erreur
  async handleError(error: Error | AppError, context?: any): Promise<AppError> {
    const appError = this.normalizeError(error, context);
    
    // Logger l'erreur
    await this.logError(appError);
    
    // Ajouter à la queue pour traitement
    this.errorQueue.push(appError);
    
    // Traiter la queue si pas déjà en cours
    if (!this.isProcessing) {
      this.processErrorQueue();
    }

    return appError;
  }

  // Normaliser une erreur en AppError
  private normalizeError(error: Error | AppError, context?: any): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    // Erreurs Firebase spécifiques
    if (this.isFirebaseError(error)) {
      return this.handleFirebaseError(error);
    }

    // Erreurs réseau
    if (this.isNetworkError(error)) {
      return ErrorFactory.network(error.message, error, context);
    }

    // Erreur générique
    return ErrorFactory.unknown(error.message, error, context);
  }

  // Vérifier si c'est une AppError
  private isAppError(error: any): error is AppError {
    return error && typeof error.type === 'string';
  }

  // Vérifier si c'est une erreur Firebase
  private isFirebaseError(error: any): boolean {
    return error && (
      error.code?.startsWith('auth/') ||
      error.code?.startsWith('firestore/') ||
      error.code?.startsWith('storage/') ||
      error.code?.startsWith('functions/')
    );
  }

  // Vérifier si c'est une erreur réseau
  private isNetworkError(error: any): boolean {
    return error && (
      error.message?.includes('network') ||
      error.message?.includes('fetch') ||
      error.code === 'NETWORK_ERROR' ||
      !navigator.onLine
    );
  }

  // Gérer les erreurs Firebase spécifiques
  private handleFirebaseError(error: any): AppError {
    const code = error.code || 'unknown';
    
    // Erreurs d'authentification
    if (code.startsWith('auth/')) {
      return this.handleAuthError(code, error.message, error);
    }
    
    // Erreurs Firestore
    if (code.startsWith('firestore/')) {
      return this.handleFirestoreError(code, error.message, error);
    }
    
    // Autres erreurs Firebase
    return ErrorFactory.firebase(code, error.message, error);
  }

  // Gérer les erreurs d'authentification
  private handleAuthError(code: string, message: string, originalError: Error): AppError {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return new CustomError(
          'AUTHENTICATION_ERROR',
          message,
          'Email ou mot de passe incorrect',
          code,
          401,
          originalError
        );
      
      case 'auth/email-already-in-use':
        return new CustomError(
          'VALIDATION_ERROR',
          message,
          'Cette adresse email est déjà utilisée',
          code,
          400,
          originalError
        );
      
      case 'auth/weak-password':
        return new CustomError(
          'VALIDATION_ERROR',
          message,
          'Le mot de passe doit contenir au moins 6 caractères',
          code,
          400,
          originalError
        );
      
      case 'auth/too-many-requests':
        return new CustomError(
          'AUTHENTICATION_ERROR',
          message,
          'Trop de tentatives. Réessayez plus tard',
          code,
          429,
          originalError
        );
      
      default:
        return ErrorFactory.authentication(message, code, originalError);
    }
  }

  // Gérer les erreurs Firestore
  private handleFirestoreError(code: string, message: string, originalError: Error): AppError {
    switch (code) {
      case 'firestore/permission-denied':
        return ErrorFactory.authorization(message, { firestoreCode: code });
      
      case 'firestore/not-found':
        return ErrorFactory.notFound('Document', 'unknown');
      
      case 'firestore/unavailable':
        return ErrorFactory.network('Service temporairement indisponible', originalError);
      
      default:
        return ErrorFactory.firebase(code, message, originalError);
    }
  }

  // Logger l'erreur
  private async logError(error: AppError): Promise<void> {
    try {
      const logLevel = this.getLogLevel(error.type);
      const category = this.getLogCategory(error.type);
      
      await logger[logLevel](category, error.message, {
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        userMessage: error.userMessage,
        context: error.context,
        stack: error.stack,
        originalError: error.originalError?.message
      }, error.originalError);
      
    } catch (logError) {
      console.error('Erreur lors du logging:', logError);
    }
  }

  // Déterminer le niveau de log
  private getLogLevel(type: ErrorType): 'debug' | 'info' | 'warn' | 'error' | 'critical' {
    switch (type) {
      case 'VALIDATION_ERROR':
      case 'NOT_FOUND_ERROR':
        return 'warn';
      case 'AUTHENTICATION_ERROR':
      case 'AUTHORIZATION_ERROR':
        return 'error';
      case 'SERVER_ERROR':
      case 'FIREBASE_ERROR':
        return 'critical';
      default:
        return 'error';
    }
  }

  // Déterminer la catégorie de log
  private getLogCategory(type: ErrorType): 'auth' | 'user' | 'request' | 'system' | 'security' {
    switch (type) {
      case 'AUTHENTICATION_ERROR':
      case 'AUTHORIZATION_ERROR':
        return 'auth';
      case 'VALIDATION_ERROR':
        return 'user';
      case 'NETWORK_ERROR':
      case 'SERVER_ERROR':
      case 'FIREBASE_ERROR':
        return 'system';
      default:
        return 'system';
    }
  }

  // Traiter la queue d'erreurs
  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.errorQueue.length > 0) {
        const error = this.errorQueue.shift();
        if (error) {
          await this.processError(error);
        }
      }
    } catch (processingError) {
      console.error('Erreur lors du traitement de la queue:', processingError);
    } finally {
      this.isProcessing = false;
    }
  }

  // Traiter une erreur individuelle
  private async processError(error: AppError): Promise<void> {
    // Notifier les composants d'erreur
    this.notifyErrorComponents(error);
    
    // Actions spécifiques selon le type d'erreur
    switch (error.type) {
      case 'AUTHENTICATION_ERROR':
        this.handleAuthenticationError(error);
        break;
      case 'NETWORK_ERROR':
        this.handleNetworkError(error);
        break;
      case 'SERVER_ERROR':
        this.handleServerError(error);
        break;
    }
  }

  // Notifier les composants d'erreur
  private notifyErrorComponents(error: AppError): void {
    const event = new CustomEvent('app-error', {
      detail: {
        type: error.type,
        message: error.userMessage || error.message,
        code: error.code,
        context: error.context
      }
    });
    
    window.dispatchEvent(event);
  }

  // Gérer les erreurs d'authentification
  private handleAuthenticationError(error: AppError): void {
    // Rediriger vers la page de connexion si nécessaire
    if (error.code === 'auth/invalid-credential' || error.statusCode === 401) {
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }

  // Gérer les erreurs réseau
  private handleNetworkError(error: AppError): void {
    // Vérifier la connectivité
    if (!navigator.onLine) {
      this.notifyOfflineMode();
    }
  }

  // Gérer les erreurs serveur
  private handleServerError(error: AppError): void {
    // Implémenter retry logic si nécessaire
    if (error.context?.retryable) {
      this.scheduleRetry(error);
    }
  }

  // Notifier le mode hors ligne
  private notifyOfflineMode(): void {
    const event = new CustomEvent('app-offline', {
      detail: { message: 'Connexion internet perdue' }
    });
    window.dispatchEvent(event);
  }

  // Programmer un retry
  private scheduleRetry(error: AppError): void {
    // Logique de retry à implémenter
    console.log('Retry programmé pour:', error.message);
  }

  // Nettoyer les erreurs anciennes
  clearOldErrors(): void {
    this.errorQueue = [];
  }

  // Obtenir les statistiques d'erreurs
  getErrorStats(): { total: number; byType: Record<ErrorType, number> } {
    const stats = {
      total: this.errorQueue.length,
      byType: {} as Record<ErrorType, number>
    };

    this.errorQueue.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }
}

// Instance globale
export const globalErrorHandler = GlobalErrorHandler.getInstance();

// Fonction utilitaire pour gérer les erreurs
export const handleError = async (error: Error | AppError, context?: any): Promise<AppError> => {
  return await globalErrorHandler.handleError(error, context);
};

// Décorateur pour les méthodes async
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<T>
) {
  const method = descriptor.value!;
  
  descriptor.value = (async function (this: any, ...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      const handledError = await handleError(error as Error, {
        method: propertyName,
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
      });
      throw handledError;
    }
  }) as T;
  
  return descriptor;
}

// Wrapper pour les fonctions async
export const withErrorWrapper = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const handledError = await handleError(error as Error, {
        function: context || fn.name,
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
      });
      throw handledError;
    }
  }) as T;
};