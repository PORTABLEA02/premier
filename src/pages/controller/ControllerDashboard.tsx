import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { userService } from '../../services/userService';
import { ServiceRequest } from '../../types';

export default function ControllerDashboard() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const requestsData = await userService.getAllServiceRequests();
        setRequests(requestsData);
      } catch (error) {
        console.error('Erreur lors du chargement des demandes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();

    // S'abonner aux mises à jour en temps réel
    const unsubscribe = userService.subscribeToAllRequests((requestsData) => {
      setRequests(requestsData);
    });

    return () => unsubscribe();
  }, []);

  // Données pour le graphique des demandes par mois
  const requestsByMonth = React.useMemo(() => {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYear = new Date().getFullYear();
    
    return monthNames.map((month, index) => {
      const count = requests.filter(r => {
        const requestDate = new Date(r.submissionDate);
        return requestDate.getMonth() === index && requestDate.getFullYear() === currentYear;
      }).length;
      
      return { month, demandes: count };
    });
  }, [requests]);

  // Activité récente
  const recentActivity = React.useMemo(() => {
    return requests
      .filter(request => request.status === 'pending' || request.status === 'under_review')
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
      .slice(0, 5)
      .map(request => ({
        user: request.memberName,
        action: `a soumis une demande de ${request.service}`,
        time: new Date(request.submissionDate).toLocaleDateString('fr-FR'),
        status: request.status === 'pending' ? 'new' : 'review'
      }));
  }, [requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const stats = [
    { 
      name: 'En attente de révision', 
      value: requests.filter(r => r.status === 'pending').length.toString(), 
      icon: Clock, 
      color: 'orange', 
      change: '+0%' 
    },
    { 
      name: 'En cours de révision', 
      value: requests.filter(r => r.status === 'under_review').length.toString(), 
      icon: FileText, 
      color: 'blue', 
      change: '+0%' 
    },
    { 
      name: 'Avis favorables', 
      value: requests.filter(r => r.status === 'controller_approved').length.toString(), 
      icon: CheckCircle, 
      color: 'green', 
      change: '+0%' 
    },
    { 
      name: 'Avis défavorables', 
      value: requests.filter(r => r.status === 'controller_rejected').length.toString(), 
      icon: XCircle, 
      color: 'red', 
      change: '+0%' 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Contrôleur</h1>
        <p className="text-gray-600 mt-2">Révision et contrôle des demandes de prestations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                </div>
              </div>
              <div className={`h-12 w-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Évolution des demandes</h3>
          {requestsByMonth.some(data => data.demandes > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={requestsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar dataKey="demandes" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Demandes à réviser</h3>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.status === 'new' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {activity.status === 'new' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Nouveau
                        </span>
                      )}
                      {activity.status === 'review' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          En révision
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Aucune demande en attente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Info */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-start">
          <AlertTriangle className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-lg font-medium text-green-900 mb-2">Processus de validation</h4>
            <div className="text-sm text-green-800 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <span>Demande soumise par le membre → <strong>En attente de révision</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span>Contrôleur examine la demande → <strong>En cours de révision</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span>Contrôleur émet un avis → <strong>Avis favorable/défavorable</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <span>Administrateur valide définitivement → <strong>Approuvée/Rejetée</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}