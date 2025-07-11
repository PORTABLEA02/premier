import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Check, X, MessageSquare, Calendar, User, CheckCircle, XCircle, FileText } from 'lucide-react';
import { userService } from '../../services/userService';
import { ServiceRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function FinalValidation() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'controller_approved' | 'controller_rejected'>('controller_approved');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const requestsData = await userService.getAllServiceRequests();
        // Filtrer pour ne montrer que les demandes avec avis du contrôleur
        const finalValidationRequests = requestsData.filter(r => 
          r.status === 'controller_approved' || r.status === 'controller_rejected'
        );
        setRequests(finalValidationRequests);
      } catch (error) {
        console.error('Erreur lors du chargement des demandes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();

    // S'abonner aux mises à jour en temps réel
    const unsubscribe = userService.subscribeToAllRequests((requestsData) => {
      const finalValidationRequests = requestsData.filter(r => 
        r.status === 'controller_approved' || r.status === 'controller_rejected'
      );
      setRequests(finalValidationRequests);
    });

    return () => unsubscribe();
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleFinalDecision = async (requestId: string, decision: 'approved' | 'rejected', comment: string) => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      await userService.updateRequestStatus(requestId, decision, comment, user.name);
      
      // Mettre à jour l'état local
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { 
              ...request, 
              status: decision, 
              comments: comment,
              responseDate: new Date().toISOString(),
              reviewedBy: user.name
            }
          : request
      ));
      
      setSelectedRequest(null);
      setComment('');
    } catch (error) {
      console.error('Erreur lors de la validation finale:', error);
      alert('Erreur lors de la validation finale');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'controller_approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'controller_rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'controller_approved': return <CheckCircle className="h-4 w-4" />;
      case 'controller_rejected': return <XCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'controller_approved': return 'Avis favorable du contrôleur';
      case 'controller_rejected': return 'Avis défavorable du contrôleur';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Validation finale</h1>
        <p className="text-gray-600 mt-2">Validation définitive des demandes après avis du contrôleur</p>
      </div>

      {/* Workflow Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start">
          <FileText className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-lg font-medium text-blue-900 mb-2">Processus de validation en deux étapes</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                <span><strong>Étape 1 :</strong> Le contrôleur a examiné les demandes et émis un avis</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span><strong>Étape 2 :</strong> Validation finale par l'administrateur (vous)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[250px]"
            >
              <option value="all">Tous les avis</option>
              <option value="controller_approved">Avis favorables</option>
              <option value="controller_rejected">Avis défavorables</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Avis favorables', count: requests.filter(r => r.status === 'controller_approved').length, color: 'green' },
          { label: 'Avis défavorables', count: requests.filter(r => r.status === 'controller_rejected').length, color: 'red' },
          { label: 'Total à valider', count: requests.length, color: 'blue' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucune demande trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{request.memberName}</h3>
                        <p className="text-sm text-gray-500">{request.memberEmail}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{getStatusText(request.status)}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Service demandé</p>
                        <p className="text-sm text-gray-900">{request.service}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Montant</p>
                        <p className="text-lg font-semibold text-gray-900">{request.amount.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Date de soumission</p>
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(request.submissionDate).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    {/* Avis du contrôleur */}
                    {request.controllerReview && (
                      <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                        request.controllerReview.decision === 'approved' 
                          ? 'bg-green-50 border-green-400' 
                          : 'bg-red-50 border-red-400'
                      }`}>
                        <div className="flex items-center mb-2">
                          {request.controllerReview.decision === 'approved' ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mr-2" />
                          )}
                          <p className="text-sm font-medium text-gray-900">
                            Avis du contrôleur : {request.controllerReview.decision === 'approved' ? 'Favorable' : 'Défavorable'}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{request.controllerReview.comments}</p>
                        <p className="text-xs text-gray-500">
                          Par {request.controllerReview.reviewedBy} le {new Date(request.controllerReview.reviewDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="Voir les détails"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setComment('Validation définitive après examen de l\'avis du contrôleur.');
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                      title="Approuver définitivement"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setComment('');
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Rejeter définitivement"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for final validation */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Validation finale - {selectedRequest.memberName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Avis du contrôleur : <span className="font-medium">
                  {selectedRequest.controllerReview?.decision === 'approved' ? 'Favorable' : 'Défavorable'}
                </span>
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700">Service demandé</p>
                  <p className="text-lg text-gray-900">{selectedRequest.service}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Montant</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedRequest.amount.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Bénéficiaire</p>
                  <p className="text-lg text-gray-900">{selectedRequest.beneficiary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Date de soumission</p>
                  <p className="text-lg text-gray-900">{new Date(selectedRequest.submissionDate).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {/* Avis du contrôleur */}
              {selectedRequest.controllerReview && (
                <div className={`p-4 rounded-lg border-l-4 ${
                  selectedRequest.controllerReview.decision === 'approved' 
                    ? 'bg-green-50 border-green-400' 
                    : 'bg-red-50 border-red-400'
                }`}>
                  <div className="flex items-center mb-2">
                    {selectedRequest.controllerReview.decision === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <p className="text-sm font-medium text-gray-900">
                      Avis du contrôleur : {selectedRequest.controllerReview.decision === 'approved' ? 'Favorable' : 'Défavorable'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{selectedRequest.controllerReview.comments}</p>
                  <p className="text-xs text-gray-500">
                    Par {selectedRequest.controllerReview.reviewedBy} le {new Date(selectedRequest.controllerReview.reviewDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Description de la demande</p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{selectedRequest.description}</p>
                </div>
              </div>

              {/* Commentaire administrateur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire de validation finale
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Ajoutez un commentaire sur votre décision finale..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setComment('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                disabled={isProcessing}
              >
                Fermer
              </button>
              <button
                onClick={() => handleFinalDecision(selectedRequest.id, 'rejected', comment)}
                disabled={isProcessing || !comment.trim()}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Traitement...' : 'Rejeter définitivement'}
              </button>
              <button
                onClick={() => handleFinalDecision(selectedRequest.id, 'approved', comment)}
                disabled={isProcessing || !comment.trim()}
                className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Traitement...' : 'Approuver définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}