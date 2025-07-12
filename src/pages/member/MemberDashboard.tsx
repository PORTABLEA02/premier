import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertTriangle, Users, Bell, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { ServiceRequest, FamilyMember } from '../../types';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [userRequests, userFamilyMembers] = await Promise.all([
          userService.getUserServiceRequests(user.id),
          userService.getFamilyMembers(user.id)
        ]);
        
        setRequests(userRequests);
        setFamilyMembers(userFamilyMembers);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // S'abonner aux mises à jour en temps réel des demandes
    const unsubscribe = userService.subscribeToUserRequests(user.id, (userRequests) => {
      setRequests(userRequests);
    });

    return () => unsubscribe();
  }, [user]);

  const stats = [
    { 
      name: 'Demandes soumises', 
      value: requests.length.toString(), 
      icon: FileText, 
      color: 'blue',
      link: '/member/history?filter=all'
    },
    { 
      name: 'En attente', 
      value: requests.filter(r => r.status === 'pending').length.toString(), 
      icon: Clock, 
      color: 'orange',
      link: '/member/history?filter=pending'
    },
    { 
      name: 'Approuvées', 
      value: requests.filter(r => r.status === 'approved').length.toString(), 
      icon: CheckCircle, 
      color: 'green',
      link: '/member/history?filter=approved'
    },
    { 
      name: 'Membres famille', 
      value: familyMembers.length.toString(), 
      icon: Users, 
      color: 'purple',
      link: '/member/family'
    },
  ];

  // Demandes récentes (5 dernières)
  const recentRequests = requests.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bienvenue sur votre espace personnel MuSAIB, {user?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200 block"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Demandes récentes</h3>
              <Link 
                to="/member/history"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir tout
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">Aucune demande trouvée</p>
                <Link
                  to="/member/request"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle demande
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{request.service}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(request.submissionDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {request.amount.toLocaleString()} FCFA
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status === 'pending' ? 'En attente' :
                         request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Actions rapides</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              <Link
                to="/member/request"
                className="p-6 text-center bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors duration-200 block"
              >
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-blue-900">Nouvelle demande</p>
                <p className="text-xs text-blue-700 mt-1">Soumettre une demande de service</p>
              </Link>
              
              <Link
                to="/member/family"
                className="p-6 text-center bg-green-50 hover:bg-green-100 rounded-xl transition-colors duration-200 block"
              >
                <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-green-900">Gérer la famille</p>
                <p className="text-xs text-green-700 mt-1">Ajouter ou modifier les membres</p>
              </Link>
              
              <Link
                to="/member/history"
                className="p-6 text-center bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors duration-200 block"
              >
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-purple-900">Voir l'historique</p>
                <p className="text-xs text-purple-700 mt-1">Consulter vos demandes passées</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {requests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Résumé financier</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {requests.reduce((sum, req) => sum + Number(req.amount), 0).toLocaleString()} FCFA
              </p>
              <p className="text-sm text-blue-800">Total demandé</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {requests
                  .filter(req => req.status === 'approved')
                  .reduce((sum, req) => sum + Number(req.amount), 0)
                  .toLocaleString()} FCFA
              </p>
              <p className="text-sm text-green-800">Montant approuvé</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {requests
                  .filter(req => req.status === 'pending')
                  .reduce((sum, req) => sum + Number(req.amount), 0)
                  .toLocaleString()} FCFA
              </p>
              <p className="text-sm text-yellow-800">En attente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}