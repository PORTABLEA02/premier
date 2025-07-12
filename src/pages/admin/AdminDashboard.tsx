import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { userService } from '../../services/userService';
import { User, ServiceRequest } from '../../types';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Move all useMemo hooks to the top, before any conditional returns
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

  // Données pour le graphique de répartition par service
  const serviceDistribution = React.useMemo(() => {
    const serviceCount: { [key: string]: number } = {};
    
    requests.forEach(request => {
      serviceCount[request.service] = (serviceCount[request.service] || 0) + 1;
    });
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return Object.entries(serviceCount).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [requests]);

  // Activité récente
  const recentActivity = React.useMemo(() => {
    return requests
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
      .slice(0, 5)
      .map(request => ({
        user: request.memberName,
        action: `a soumis une demande de ${request.service}`,
        time: new Date(request.submissionDate).toLocaleDateString('fr-FR'),
        status: request.status === 'pending' ? 'new' : request.status === 'approved' ? 'success' : 'error'
      }));
  }, [requests]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, requestsData] = await Promise.all([
          userService.getAllUsers(),
          userService.getAllServiceRequests()
        ]);
        
        setUsers(usersData);
        setRequests(requestsData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // S'abonner aux mises à jour en temps réel des demandes
    const unsubscribe = userService.subscribeToAllRequests((requestsData) => {
      setRequests(requestsData);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    { 
      name: 'Total adhérents', 
      value: users.length.toString(), 
      icon: Users, 
      color: 'blue', 
      change: '+0%',
      link: '/admin/users',
      action: 'view'
    },
    { 
      name: 'Demandes en attente', 
      value: requests.filter(r => r.status === 'pending').length.toString(), 
      icon: Clock, 
      color: 'orange', 
      change: '+0%',
      link: '/admin/requests?status=pending',
      action: 'view'
    },
    { 
      name: 'Demandes traitées', 
      value: requests.filter(r => r.status !== 'pending').length.toString(), 
      icon: CheckCircle, 
      color: 'green', 
      change: '+0%',
      link: '/admin/requests?status=treated',
      action: 'view'
    },
    { 
      name: 'Demandes ce mois', 
      value: requests.filter(r => {
        const requestDate = new Date(r.submissionDate);
        const now = new Date();
        return requestDate.getMonth() === now.getMonth() && requestDate.getFullYear() === now.getFullYear();
      }).length.toString(), 
      icon: FileText, 
      color: 'purple', 
      change: '+0%',
      link: '/admin/requests',
      action: 'view'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrateur</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble de la plateforme MuSAIB</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link 
            key={stat.name} 
            to={stat.link}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200 block group hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors duration-200">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors duration-200">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                </div>
              </div>
              <div className={`h-12 w-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${stat.color}-200 transition-colors duration-200`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600 group-hover:text-${stat.color}-700 transition-colors duration-200`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar chart */}
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
                <Bar dataKey="demandes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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

        {/* Pie chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Répartition par service</h3>
          {serviceDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activité récente</h3>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.status === 'new' ? 'bg-blue-500' :
                    activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {activity.status === 'new' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Nouveau
                      </span>
                    )}
                    {activity.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {activity.status === 'error' && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Aucune activité récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}