import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Logger l'erreur avec tous les détails
    logger.critical('system', 'Erreur capturée par Error Boundary', {
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    }, error);

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    logger.info('user', 'Utilisateur a rechargé la page après erreur', {
      errorId: this.state.errorId
    });
    window.location.reload();
  };

  handleGoHome = () => {
    logger.info('user', 'Utilisateur retourne à l\'accueil après erreur', {
      errorId: this.state.errorId
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Interface d'erreur par défaut
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Oups ! Une erreur s'est produite
            </h1>
            
            <p className="text-gray-600 mb-6">
              Nous sommes désolés, mais quelque chose s'est mal passé. 
              L'erreur a été automatiquement signalée à notre équipe technique.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Information technique :</h3>
                <p className="text-xs text-blue-700">
                  L'erreur a été automatiquement signalée à notre équipe technique.
                </p>
                {this.state.errorId && (
                  <p className="text-xs text-blue-600 mt-2">
                    Référence: {this.state.errorId}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recharger la page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                <Home className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </button>
            </div>

            {this.state.errorId && (
              <p className="text-xs text-gray-500 mt-6">
                Référence d'erreur: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;