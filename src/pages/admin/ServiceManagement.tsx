import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { userService } from '../../services/userService';

interface Service {
  id: string;
  name: string;
  description: string;
  maxAmount: number;
  isActive: boolean;
  createdDate: string;
}

interface ServiceForm {
  name: string;
  description: string;
  maxAmount: number;
  isActive: boolean;
}

export default function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceForm>();

  // Charger les services depuis Firebase
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        const servicesData = await userService.getAllServices();
        setServices(servicesData);
      } catch (error) {
        console.error('Erreur lors du chargement des services:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  const onSubmit = async (data: ServiceForm) => {
    try {
      if (editingService) {
        // Update existing service
        await userService.updateService(editingService.id, data);
        setServices(services.map(service => 
          service.id === editingService.id 
            ? { ...service, ...data }
            : service
        ));
      } else {
        // Create new service
        const newServiceData = {
          ...data,
          createdDate: new Date().toISOString().split('T')[0],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const serviceId = await userService.addService(newServiceData);
        const newService: Service = {
          id: serviceId,
          ...data,
          createdDate: new Date().toISOString().split('T')[0]
        };
        setServices([...services, newService]);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du service:', error);
      alert('Erreur lors de la sauvegarde du service');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    reset(service);
    setShowModal(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      try {
        await userService.deleteService(serviceId);
        setServices(services.filter(service => service.id !== serviceId));
      } catch (error) {
        console.error('Erreur lors de la suppression du service:', error);
        alert('Erreur lors de la suppression du service');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
    reset();
  };

  const toggleServiceStatus = async (serviceId: string) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        const newStatus = !service.isActive;
        await userService.updateService(serviceId, { isActive: newStatus });
        setServices(services.map(service => 
          service.id === serviceId 
            ? { ...service, isActive: newStatus }
            : service
        ));
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      alert('Erreur lors du changement de statut');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des services</h1>
          <p className="text-gray-600 mt-2">Configurez les services et prestations disponibles</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total services</p>
              <p className="text-2xl font-bold text-gray-900">{services.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Services actifs</p>
              <p className="text-2xl font-bold text-gray-900">{services.filter(s => s.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Services inactifs</p>
              <p className="text-2xl font-bold text-gray-900">{services.filter(s => !s.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Aucun service configuré</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Créer le premier service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Montant maximum</span>
                  <span className="text-sm font-medium text-gray-900">{service.maxAmount.toLocaleString()} FCFA</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Statut</span>
                  <button
                    onClick={() => toggleServiceStatus(service.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      service.isActive ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        service.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Créé le {new Date(service.createdDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingService ? 'Modifier le service' : 'Nouveau service'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du service
                </label>
                <input
                  {...register('name', { required: 'Le nom est requis' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Scolaire"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description', { required: 'La description est requise' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Description du service..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant maximum (FCFA)
                </label>
                <input
                  {...register('maxAmount', { 
                    required: 'Le montant est requis',
                    min: { value: 0, message: 'Le montant doit être positif' }
                  })}
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="500000"
                />
                {errors.maxAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxAmount.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  {...register('isActive')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Service actif
                </label>
              </div>
            </form>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              >
                {editingService ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}