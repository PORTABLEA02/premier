import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  timestamp: Date;
  userEmail?: string;
  details?: any;
}

interface LogsViewerProps {
  maxLogs?: number;
  showFilters?: boolean;
  realTime?: boolean;
  className?: string;
}

export default function LogsViewer({ 
  maxLogs = 100, 
  showFilters = true, 
  realTime = false,
  className = '' 
}: LogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(maxLogs));
    
    if (levelFilter !== 'all') {
      q = query(collection(db, 'logs'), where('level', '==', levelFilter), orderBy('timestamp', 'desc'), limit(maxLogs));
    }

    if (realTime) {
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const logsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          } as LogEntry;
        });
        setLogs(logsData);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Load once
      const loadLogs = async () => {
        try {
          const querySnapshot = await getDocs(q);
          const logsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date()
            } as LogEntry;
          });
          setLogs(logsData);
        } catch (error) {
          console.error('Erreur lors du chargement des logs:', error);
        } finally {
          setLoading(false);
        }
      };

      loadLogs();
    }
  }, [levelFilter, maxLogs, realTime]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warn': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'debug': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Chargement des logs...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showFilters && (
        <div className="flex items-center space-x-4">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Tous les niveaux</option>
            <option value="critical">Critique</option>
            <option value="error">Erreur</option>
            <option value="warn">Avertissement</option>
            <option value="info">Information</option>
            <option value="debug">Debug</option>
          </select>
          
          {realTime && (
            <div className="flex items-center text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              Temps réel
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Aucun log trouvé</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow duration-200"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getLevelIcon(log.level)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-xs text-gray-500">
                    {log.timestamp.toLocaleString('fr-FR')}
                  </span>
                  {log.userEmail && (
                    <span className="text-xs text-gray-500">
                      • {log.userEmail}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-900 truncate">
                  {log.message}
                </p>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {log.category}
                  </span>
                  
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Détails du log</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <p className="text-sm text-gray-900">{selectedLog.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Niveau</label>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getLevelColor(selectedLog.level)}`}>
                    {selectedLog.level}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                  <p className="text-sm text-gray-900">{selectedLog.category}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                <p className="text-sm text-gray-900">{selectedLog.timestamp.toLocaleString('fr-FR')}</p>
              </div>
              
              {selectedLog.userEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Utilisateur</label>
                  <p className="text-sm text-gray-900">{selectedLog.userEmail}</p>
                </div>
              )}
              
              {selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Détails</label>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded border overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}