// Gestionnaire de retry pour les opérations qui peuvent échouer temporairement
import { handleError, ErrorFactory, AppError } from './errorHandler';
import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error) => {
    // Retry pour les erreurs réseau et serveur temporaires
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('unavailable') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('504')
      );
    }
    return false;
  },
  onRetry: () => {}
};

export class RetryHandler {
  private static instance: RetryHandler;

  static getInstance(): RetryHandler {
    if (!RetryHandler.instance) {
      RetryHandler.instance = new RetryHandler();
    }
    return RetryHandler.instance;
  }

  // Exécuter une fonction avec retry automatique
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    context?: string
  ): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await fn();
        
        // Logger le succès après retry
        if (attempt > 1) {
          logger.info('system', `Opération réussie après ${attempt} tentatives`, {
            context,
            attempts: attempt
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Vérifier si on doit retry
        if (attempt === opts.maxAttempts || !opts.retryCondition(lastError)) {
          break;
        }
        
        // Calculer le délai avec backoff exponentiel
        const delay = Math.min(
          opts.baseDelay * Math.pow(opts.backoffFactor, attempt - 1),
          opts.maxDelay
        );
        
        logger.warn('system', `Tentative ${attempt} échouée, retry dans ${delay}ms`, {
          context,
          attempt,
          error: lastError.message,
          nextDelay: delay
        });
        
        // Appeler le callback de retry
        opts.onRetry(attempt, lastError);
        
        // Attendre avant le prochain essai
        await this.delay(delay);
      }
    }

    // Toutes les tentatives ont échoué
    logger.error('system', `Toutes les tentatives échouées après ${opts.maxAttempts} essais`, {
      context,
      maxAttempts: opts.maxAttempts,
      finalError: lastError.message
    }, lastError);

    throw await handleError(lastError, {
      context,
      retryAttempts: opts.maxAttempts,
      retryFailed: true
    });
  }

  // Wrapper pour les fonctions async avec retry
  withRetry<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {},
    context?: string
  ): T {
    return (async (...args: any[]) => {
      return this.executeWithRetry(
        () => fn(...args),
        options,
        context || fn.name
      );
    }) as T;
  }

  // Délai avec possibilité d'annulation
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry spécialisé pour les opérations réseau
  async retryNetworkOperation<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return this.executeWithRetry(
      operation,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffFactor: 2,
        retryCondition: (error) => {
          // Retry pour les erreurs réseau spécifiques
          const networkErrors = [
            'network error',
            'fetch failed',
            'connection refused',
            'timeout',
            'unavailable'
          ];
          
          return networkErrors.some(errorType => 
            error.message.toLowerCase().includes(errorType)
          );
        },
        onRetry: (attempt, error) => {
          logger.warn('network', `Retry opération réseau (tentative ${attempt})`, {
            context,
            error: error.message
          });
        }
      },
      context
    );
  }

  // Retry spécialisé pour les opérations Firebase
  async retryFirebaseOperation<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return this.executeWithRetry(
      operation,
      {
        maxAttempts: 3,
        baseDelay: 500,
        backoffFactor: 2,
        retryCondition: (error: any) => {
          // Retry pour certaines erreurs Firebase
          const retryableCodes = [
            'unavailable',
            'deadline-exceeded',
            'resource-exhausted',
            'internal',
            'unknown'
          ];
          
          return error.code && retryableCodes.includes(error.code);
        },
        onRetry: (attempt, error) => {
          logger.warn('firebase', `Retry opération Firebase (tentative ${attempt})`, {
            context,
            error: error.message,
            code: (error as any).code
          });
        }
      },
      context
    );
  }

  // Retry avec circuit breaker simple
  private circuitBreakerState = new Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }>();

  async executeWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    circuitKey: string,
    options: RetryOptions & {
      failureThreshold?: number;
      recoveryTimeout?: number;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000, // 1 minute
      ...retryOptions
    } = options;

    const circuit = this.circuitBreakerState.get(circuitKey) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const
    };

    // Vérifier l'état du circuit breaker
    if (circuit.state === 'open') {
      const timeSinceLastFailure = Date.now() - circuit.lastFailure;
      if (timeSinceLastFailure < recoveryTimeout) {
        throw ErrorFactory.server(
          `Circuit breaker ouvert pour ${circuitKey}`,
          undefined,
          { circuitKey, timeRemaining: recoveryTimeout - timeSinceLastFailure }
        );
      } else {
        // Passer en half-open
        circuit.state = 'half-open';
        this.circuitBreakerState.set(circuitKey, circuit);
      }
    }

    try {
      const result = await this.executeWithRetry(fn, retryOptions, circuitKey);
      
      // Succès - réinitialiser le circuit
      if (circuit.state === 'half-open' || circuit.failures > 0) {
        circuit.failures = 0;
        circuit.state = 'closed';
        this.circuitBreakerState.set(circuitKey, circuit);
        
        logger.info('system', `Circuit breaker fermé pour ${circuitKey}`, {
          circuitKey
        });
      }
      
      return result;
    } catch (error) {
      // Échec - incrémenter les échecs
      circuit.failures++;
      circuit.lastFailure = Date.now();
      
      if (circuit.failures >= failureThreshold) {
        circuit.state = 'open';
        logger.error('system', `Circuit breaker ouvert pour ${circuitKey}`, {
          circuitKey,
          failures: circuit.failures,
          threshold: failureThreshold
        });
      }
      
      this.circuitBreakerState.set(circuitKey, circuit);
      throw error;
    }
  }

  // Obtenir l'état des circuit breakers
  getCircuitBreakerStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.circuitBreakerState.forEach((circuit, key) => {
      stats[key] = {
        state: circuit.state,
        failures: circuit.failures,
        lastFailure: circuit.lastFailure ? new Date(circuit.lastFailure) : null
      };
    });
    
    return stats;
  }

  // Réinitialiser un circuit breaker
  resetCircuitBreaker(circuitKey: string): void {
    this.circuitBreakerState.delete(circuitKey);
    logger.info('system', `Circuit breaker réinitialisé pour ${circuitKey}`, {
      circuitKey
    });
  }
}

// Instance globale
export const retryHandler = RetryHandler.getInstance();

// Fonctions utilitaires
export const withRetry = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions,
  context?: string
): T => {
  return retryHandler.withRetry(fn, options, context);
};

export const retryNetworkOperation = <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> => {
  return retryHandler.retryNetworkOperation(operation, context);
};

export const retryFirebaseOperation = <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> => {
  return retryHandler.retryFirebaseOperation(operation, context);
};