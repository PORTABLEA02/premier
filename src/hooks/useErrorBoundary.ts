import { useState, useCallback } from 'react';
import { handleError, AppError } from '../utils/errorHandler';

interface UseErrorBoundaryReturn {
  error: AppError | null;
  resetError: () => void;
  captureError: (error: Error, context?: any) => Promise<void>;
  hasError: boolean;
}

export const useErrorBoundary = (): UseErrorBoundaryReturn => {
  const [error, setError] = useState<AppError | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback(async (error: Error, context?: any) => {
    try {
      const appError = await handleError(error, context);
      setError(appError);
    } catch (handlingError) {
      console.error('Erreur lors de la gestion d\'erreur:', handlingError);
      setError({
        type: 'UNKNOWN_ERROR',
        name: 'UnknownError',
        message: 'Erreur inconnue lors de la gestion d\'erreur',
        userMessage: 'Une erreur inattendue s\'est produite'
      } as AppError);
    }
  }, []);

  return {
    error,
    resetError,
    captureError,
    hasError: error !== null
  };
};

// Hook pour gérer les erreurs async dans les composants
export const useAsyncError = () => {
  const { captureError } = useErrorBoundary();

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: any
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      await captureError(error as Error, context);
      return null;
    }
  }, [captureError]);

  return { executeAsync };
};

// Hook pour wrapper les fonctions avec gestion d'erreur
export const useErrorWrapper = () => {
  const { captureError } = useErrorBoundary();

  const wrapFunction = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    context?: string
  ): T => {
    return ((...args: any[]) => {
      try {
        const result = fn(...args);
        
        // Si c'est une Promise, gérer les erreurs async
        if (result && typeof result.then === 'function') {
          return result.catch((error: Error) => {
            captureError(error, { function: context || fn.name, args });
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        captureError(error as Error, { function: context || fn.name, args });
        throw error;
      }
    }) as T;
  }, [captureError]);

  return { wrapFunction };
};