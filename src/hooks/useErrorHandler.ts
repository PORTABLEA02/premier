import { useCallback } from 'react';
import { logger } from '../utils/logger';

export interface ErrorHandlerOptions {
  category?: 'auth' | 'user' | 'request' | 'system' | 'security' | 'performance' | 'business';
  showToUser?: boolean;
  context?: string;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const handleError = useCallback((
    error: Error | string, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      category = 'system',
      showToUser = true,
      context,
      fallbackMessage = 'Une erreur inattendue s\'est produite'
    } = options;

    // Convertir string en Error si nécessaire
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Logger l'erreur
    logger.error(category, errorObj.message, {
      context,
      userFacing: showToUser,
      originalError: errorObj.name
    }, errorObj);

    // Afficher à l'utilisateur si demandé
    if (showToUser) {
      // Les erreurs ne sont plus affichées dans la console ou via alert
      // Elles sont uniquement loggées dans Firestore
    }

    return errorObj;
  }, []);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    options: ErrorHandlerOptions = {}
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, options);
      throw error; // Re-throw pour permettre la gestion locale
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
};