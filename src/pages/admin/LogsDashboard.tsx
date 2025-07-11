import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, AlertTriangle, Info, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { collection, query, orderBy, limit, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logger } from '../../utils/logger';

interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'auth' | 'user' | 'request' | 'system' | 'security' | 'performance' | 'business';
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

export default function LogsDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Construire la requête
      let q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(500));
      
      // Filtrer par niveau si spécifié
      if (levelFilter !== 'all') {
        q = query(collection(db, 'logs'), where('level', '==', levelFilter), orderBy('timestamp', 'desc'), limit(500));
      }
      
      // Filtrer par catégorie si spécifié
      if (categoryFilter !== 'all') {
        q = query(collection(db, 'logs'), where('category', '==', categoryFilter), orderBy('timestamp', 'desc'), limit(500));
      }
      
      const querySnapshot = await getDocs(q);
      const logsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
        } as LogEntry;
      });
      
      // Filtrer par date côté client
      const filteredLogs = filterLogsByDate(logsData, dateFilter);
      
      // Filtrer par terme de recherche
      const searchFilteredLogs = searchTerm 
        ? filteredLogs.filter(log => 
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.category.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : filteredLogs;
      
      setLogs(searchFilteredLogs);
      
      logger.info('system', 'Logs dashboard chargé', {
        totalLogs: searchFilteredLogs.length,
        filters: { level: levelFilter, category: categoryFilter, date: dateFilter }
      });
      
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
      logger.error('system', 'Erreur chargement logs dashboard', { error: error.message }, error as Error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogsByDate = (logs: LogEntry[], dateFilter: string): LogEntry[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return logs.filter(log => log.timestamp >= today);
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return logs.filter(log => log.timestamp >= yesterday && log.timestamp < today);
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logs.filter(log => log.timestamp >= weekAgo);
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return logs.filter(log => log.timestamp >= monthAgo);
      default:
        return logs;
    }
  };

  useEffect(() => {
    loadLogs();
  }, [levelFilter, categoryFilter, dateFilter]);

  useEffect(() => {
    if (searchTerm) {
      const timeoutId = setTimeout(() => {
        loadLogs();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      loadLogs();
    }
  }, [searchTerm]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 10000); // Refresh toutes les 10 secondes
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-green-100 text-green-800';
      case 'request': return 'bg-blue-100 text-blue-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      case 'security': return 'bg-red-100 text-red-800';
      case 'performance': return 'bg-orange-100 text-orange-800';
      case 'business': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Category', 'Message', 'User', 'IP', 'URL'].join(','),
      ...logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.category,
        `"${log.message.replace(/"/g, '""')}"`,
        log.userEmail || '',
        log.ip || '',
        log.url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    logger.info('system', 'Export des logs effectué', { logCount: logs.length });
  };

  const stats = {
    total: logs.length,
    critical: logs.filter(l => l.level === 'critical').length,
    error: logs.filter(l => l.level === 'error').length,
    warn: logs.filter(l => l.level === 'warn').length,
    info: logs.filter(l => l.level === 'info').length,
    security: logs.filter(l => l.category === 'security').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs & Audit</h1>
          <p className="text-gray-600 mt-2">Surveillance et analyse des événements système</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </button>
          <button
            onClick={loadLogs}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-600">Critiques</div>
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-600">Erreurs</div>
          <div className="text-2xl font-bold text-red-500">{stats.error}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-600">Avertissements</div>
          <div className="text-2xl font-bold text-yellow-500">{stats.warn}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-600">Infos</div>
          <div className="text-2xl font-bold text-blue-500">{stats.info}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-600">Sécurité</div>
          <div className="text-2xl font-bold text-purple-600">{stats.security}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les niveaux</option>
            <option value="critical">Critique</option>
            <option value="error">Erreur</option>
            <option value="warn">Avertissement</option>
            <option value="info">Information</option>
            <option value="debug">Debug</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toutes les catégories</option>
            <option value="auth">Authentification</option>
            <option value="user">Utilisateur</option>
            <option value="request">Demandes</option>
            <option value="system">Système</option>
            <option value="security">Sécurité</option>
            <option value="performance">Performance</option>
            <option value="business">Métier</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Aujourd'hui</option>
            <option value="yesterday">Hier</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="all">Toutes les dates</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Chargement des logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucun log trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.timestamp.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(log.level)}`}>
                        {getLevelIcon(log.level)}
                        <span className="ml-1 capitalize">{log.level}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.userEmail || 'Système'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Détails du log</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{selectedLog.timestamp.toLocaleString('fr-FR')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Niveau</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(selectedLog.level)}`}>
                    {getLevelIcon(selectedLog.level)}
                    <span className="ml-1 capitalize">{selectedLog.level}</span>
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(selectedLog.category)}`}>
                    {selectedLog.category}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Utilisateur</label>
                  <p className="text-sm text-gray-900">{selectedLog.userEmail || 'Système'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.sessionId || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP</label>
                  <p className="text-sm text-gray-900">{selectedLog.ip || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedLog.message}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900 break-all">{selectedLog.url}</p>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Détails</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-900 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedLog.stackTrace && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stack Trace</label>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <pre className="text-xs text-red-900 whitespace-pre-wrap overflow-x-auto">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User Agent</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-900 break-all">{selectedLog.userAgent}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}