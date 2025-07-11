import React, { Component, ErrorInfo, ReactNode } from 'react';
import { globalErrorHandler } from '../utils/errorHandler';
import ErrorFallback from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class GlobalErrorBoundary extends Component<Props, State> {
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

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      // Gérer l'erreur avec le système global
      await globalErrorHandler.handleError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        errorId: this.state.errorId
      });

      this.setState({
        error,
        errorInfo
      });

      // Appeler le callback personnalisé si fourni
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }

    } catch (handlingError) {
      console.error('Erreur lors de la gestion d\'erreur dans ErrorBoundary:', handlingError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined
    });
  };

  render() {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Utiliser le composant ErrorFallback par défaut
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.handleReset}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;