import React from 'react';
import { AlertTriangle, Shield, X, CheckCircle } from 'lucide-react';
import { useSecurityMonitoring } from '../hooks/useSecurityMonitoring';

export default function SecurityAlert() {
  const { alerts, acknowledgeAlert, clearAlerts } = useSecurityMonitoring();

  // Ne pas afficher en production pour les utilisateurs normaux
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  if (unacknowledgedAlerts.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
      case 'medium':
      case 'low':
        return <Shield className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="space-y-2">
        {unacknowledgedAlerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className={`border-l-4 p-4 rounded-lg shadow-lg ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium">
                  Alerte de sécurité - {alert.severity.toUpperCase()}
                </h4>
                <p className="text-sm mt-1">{alert.message}</p>
                <p className="text-xs mt-1 opacity-75">
                  {alert.timestamp.toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex space-x-1">
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="text-green-600 hover:text-green-800 transition-colors duration-200"
                  title="Marquer comme traité"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  title="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {unacknowledgedAlerts.length > 3 && (
          <div className="bg-gray-100 border border-gray-300 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              +{unacknowledgedAlerts.length - 3} autres alertes
            </p>
            <button
              onClick={clearAlerts}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}