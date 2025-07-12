import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Filter, Eye, Check, X, MessageSquare, Calendar, User, Clock, CheckCircle, XCircle, FileText, Download, ExternalLink } from 'lucide-react';
import { userService } from '../../services/userService';
import { ServiceRequest } from '../../types';

export default function RequestManagement() {
  const location = useLocation();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'treated'>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  // Initialiser le filtre basé sur les paramètres URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const statusParam = urlParams.get('status');
    if (statusParam && ['pending', 'approved', 'rejected', 'treated'].includes(statusParam)) {
      setStatusFilter(statusParam as 'pending' | 'approved' | 'rejected' | 'treated');
    }
  }, [location.search]);
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

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.service.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'treated') {
      matchesStatus = request.status === 'approved' || request.status === 'rejected';
    } else {
      matchesStatus = request.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (requestId: string, newStatus: 'approved' | 'rejected', comment: string) => {
    setIsProcessing(true);
    try {
      await userService.updateRequestStatus(requestId, newStatus, comment, 'Administrateur');
      
      // Mettre à jour l'état local
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { 
              ...request, 
              status: newStatus, 
              comments: comment,
              responseDate: new Date().toISOString(),
              reviewedBy: 'Administrateur'
            }
          : request
      ));
      
      setSelectedRequest(null);
      setComment('');
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      alert('Erreur lors du traitement de la demande');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDocument = (documentName: string) => {
    setSelectedDocument(documentName);
    setShowDocumentViewer(true);
  };

  const handleDownloadDocument = (documentName: string) => {
    // Simuler le téléchargement du document
    // En production, ceci ferait appel à un service de stockage comme Firebase Storage
    console.log('Téléchargement du document:', documentName);
    alert(`Téléchargement de ${documentName} en cours...`);
  };

  const getDocumentIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      default:
        return '📎';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente de traitement';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
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
        <h1 className="text-3xl font-bold text-gray-900">Gestion des demandes</h1>
        <p className="text-gray-600 mt-2">Traitement et suivi des demandes de prestations</p>
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
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente de traitement</option>
              <option value="treated">Demandes traitées</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Rejetées</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total', count: requests.length, color: 'blue' },
          { label: 'En attente de traitement', count: requests.filter(r => r.status === 'pending').length, color: 'yellow' },
          { label: 'Demandes traitées', count: requests.filter(r => r.status === 'approved' || r.status === 'rejected').length, color: 'purple' },
          { label: 'Approuvées', count: requests.filter(r => r.status === 'approved').length, color: 'green' },
          { label: 'Rejetées', count: requests.filter(r => r.status === 'rejected').length, color: 'red' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {requests.length === 0 ? (
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
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Bénéficiaire</p>
                      <p className="text-sm text-gray-900">{request.beneficiary}</p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Description</p>
                      <p className="text-sm text-gray-900 mt-1">{request.description}</p>
                    </div>

                    {/* Mode de paiement */}
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Mode de paiement</p>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            request.paymentMethod === 'mobile' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {request.paymentMethod === 'mobile' ? '📱 Mobile Monnaie' : '🏦 Virement bancaire'}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          <p><strong>Nom du bénéficiaire :</strong> {request.accountHolderName}</p>
                          {request.paymentMethod === 'mobile' && request.mobileNumber && (
                            <p><strong>Numéro de dépôt :</strong> {request.mobileNumber}</p>
                          )}
                          {request.paymentMethod === 'bank' && request.bankAccount && (
                            <p><strong>Numéro bancaire :</strong> {request.bankAccount}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Documents avec actions */}
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Pièces justificatives ({request.documents.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {request.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getDocumentIcon(doc)}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={doc}>
                                  {doc}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {doc.split('.').pop()?.toUpperCase()} • Document {index + 1}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors duration-200"
                                title="Visualiser"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors duration-200"
                                title="Télécharger"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {request.comments && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Commentaire administrateur
                        </p>
                        <p className="text-sm text-gray-900 mt-1">{request.comments}</p>
                        {request.responseDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Traité le {new Date(request.responseDate).toLocaleDateString('fr-FR')} par {request.reviewedBy}
                          </p>
                        )}
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
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setComment('Demande approuvée après vérification des documents et critères d\'éligibilité.');
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                          title="Approuver"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setComment('');
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Rejeter"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for detailed view and comments */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Traitement de la demande - {selectedRequest.memberName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Statut actuel : <span className="font-medium">{getStatusText(selectedRequest.status)}</span>
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

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Description de la demande</p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{selectedRequest.description}</p>
                </div>
              </div>

              {/* Mode de paiement détaillé */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Informations de paiement</p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedRequest.paymentMethod === 'mobile' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedRequest.paymentMethod === 'mobile' ? '📱 Mobile Monnaie' : '🏦 Virement bancaire'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nom du bénéficiaire :</strong> {selectedRequest.accountHolderName}</p>
                    {selectedRequest.paymentMethod === 'mobile' && selectedRequest.mobileNumber && (
                      <p><strong>Numéro de dépôt :</strong> {selectedRequest.mobileNumber}</p>
                    )}
                    {selectedRequest.paymentMethod === 'bank' && selectedRequest.bankAccount && (
                      <p><strong>Numéro bancaire :</strong> {selectedRequest.bankAccount}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents avec visualisation */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Pièces justificatives ({selectedRequest.documents.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedRequest.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getDocumentIcon(doc)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900" title={doc}>
                            {doc.length > 30 ? `${doc.substring(0, 30)}...` : doc}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.split('.').pop()?.toUpperCase()} • Document {index + 1}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title="Visualiser"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire administrateur
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Ajoutez un commentaire sur la décision..."
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
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleStatusChange(selectedRequest.id, 'rejected', comment)}
                    disabled={isProcessing || !comment.trim()}
                    className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Traitement...' : 'Rejeter'}
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedRequest.id, 'approved', comment)}
                    disabled={isProcessing || !comment.trim()}
                    className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Traitement...' : 'Approuver'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Visualisation du document</h3>
                <p className="text-sm text-gray-600">{selectedDocument}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadDocument(selectedDocument)}
                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                  title="Télécharger"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setShowDocumentViewer(false);
                    setSelectedDocument(null);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 h-96 flex items-center justify-center bg-gray-50">
              {/* Simulation de la visualisation du document */}
              <div className="text-center">
                <div className="text-6xl mb-4">{getDocumentIcon(selectedDocument)}</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">{selectedDocument}</h4>
                <p className="text-gray-600 mb-4">
                  Prévisualisation du document
                </p>
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 max-w-md mx-auto">
                  <p className="text-gray-500 text-sm">
                    En production, cette zone afficherait le contenu réel du document.
                    <br /><br />
                    Pour les images : aperçu de l'image
                    <br />
                    Pour les PDF : visionneuse PDF intégrée
                    <br />
                    Pour les documents : aperçu du contenu
                  </p>
                </div>
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={() => handleDownloadDocument(selectedDocument)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </button>
                  <button
                    onClick={() => window.open('#', '_blank')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir dans un nouvel onglet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}