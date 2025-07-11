import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, User, Mail, Phone, Shield, ShieldOff, RotateCcw, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { User as UserType } from '../../types';

interface CreateUserForm {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  role: 'admin' | 'member';
  password: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    defaultValues: {
      role: 'member',
      password: 'Default123'
    }
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await userService.getAllUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended') => {
    try {
      await userService.updateUserStatus(userId, newStatus);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const handlePasswordReset = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (user) {
        // TODO: Implémenter la réinitialisation de mot de passe
        alert(`Email de réinitialisation envoyé pour ${user.email}`);
      }
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    }
  };

  const handleCreateUser = async (data: CreateUserForm) => {
    setIsCreating(true);
    setCreateMessage('');
    
    try {
      const newUser = await authService.createUser({
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        address: data.address,
        birthDate: data.birthDate,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active'
      }, data.password);
      
      // Ajouter à la liste locale
      setUsers([...users, newUser]);
      
      setCreateMessage(`✅ Utilisateur créé avec succès ! 
      📧 Email: ${data.email} 
      🔑 Mot de passe: ${data.password}
      ℹ️ L'utilisateur devra changer son mot de passe lors de sa première connexion.`);
      
      // Réinitialiser le formulaire après 3 secondes
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMessage('');
        reset();
      }, 3000);
      
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      setCreateMessage(`Erreur: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateMessage('');
    reset();
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des adhérents</h1>
          <p className="text-gray-600 mt-2">Gérez les comptes et statuts des adhérents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total adhérents</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Comptes actifs</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldOff className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Comptes suspendus</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'suspended').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucun adhérent trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adhérent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">
                            Membre depuis {new Date(user.joinDate).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-y-1 flex-col items-start">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                        
                        {selectedUser === user.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handleStatusChange(user.id, user.status === 'active' ? 'suspended' : 'active')}
                                className={`flex items-center w-full px-4 py-2 text-sm transition-colors duration-200 ${
                                  user.status === 'active' 
                                    ? 'text-red-700 hover:bg-red-50' 
                                    : 'text-green-700 hover:bg-green-50'
                                }`}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    Suspendre
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Activer
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handlePasswordReset(user.id)}
                                className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors duration-200"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Réinitialiser mot de passe
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Créer un nouvel utilisateur</h2>
              <p className="text-sm text-gray-600 mt-1">
                L'utilisateur devra changer son mot de passe lors de sa première connexion
              </p>
            </div>

            <form onSubmit={handleSubmit(handleCreateUser)} className="p-6 space-y-6">
              {createMessage && (
                <div className={`p-4 rounded-lg ${
                  createMessage.includes('succès') 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {createMessage}
                </div>
              )}

              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet *
                  </label>
                  <input
                    {...register('name', { required: 'Le nom est requis' })}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jean Dupont"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email *
                  </label>
                  <input
                    {...register('email', { 
                      required: 'L\'email est requis',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Format d\'email invalide'
                      }
                    })}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="jean.dupont@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de naissance
                  </label>
                  <input
                    {...register('birthDate')}
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse complète
                </label>
                <textarea
                  {...register('address')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="123 Rue de la République, 75001 Paris"
                />
              </div>

              {/* Rôle et mot de passe */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôle *
                  </label>
                  <select
                    {...register('role', { required: 'Le rôle est requis' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Administrateur</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe temporaire *
                  </label>
                  <input
                    {...register('password', { 
                      required: 'Le mot de passe est requis',
                      minLength: {
                        value: 6,
                        message: 'Le mot de passe doit contenir au moins 6 caractères'
                      }
                    })}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Default123"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    L'utilisateur devra changer ce mot de passe lors de sa première connexion
                  </p>
                </div>
              </div>

              {/* Informations importantes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Informations importantes</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• L'utilisateur recevra ses identifiants par email (fonctionnalité à implémenter)</li>
                      <li>• Le mot de passe temporaire doit être communiqué de manière sécurisée</li>
                      <li>• L'utilisateur sera forcé de changer son mot de passe à la première connexion</li>
                      <li>• Le compte sera automatiquement activé</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                disabled={isCreating}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit(handleCreateUser)}
                disabled={isCreating}
                className="flex items-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer l'utilisateur
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}