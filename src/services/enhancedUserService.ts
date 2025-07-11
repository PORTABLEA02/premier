import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Unsubscribe,
  FirestoreError
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, FamilyMember, Service, ServiceRequest, Notification } from '../types';
import { logger, performanceLogger } from '../utils/logger';
import { handleError, ErrorFactory, withErrorWrapper } from '../utils/errorHandler';

class EnhancedUserService {
  // Utilisateurs avec gestion d'erreurs améliorée
  getAllUsers = withErrorWrapper(async (): Promise<User[]> => {
    const timer = performanceLogger.startTimer('getAllUsers');
    
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      
      timer.end({ userCount: users.length });
      logger.info('user', 'Récupération de tous les utilisateurs', {
        count: users.length
      });
      
      return users;
    } catch (error: any) {
      timer.end({ success: false, error: error.message });
      
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la récupération des utilisateurs');
      }
      
      throw ErrorFactory.server('Erreur lors de la récupération des utilisateurs', error);
    }
  }, 'UserService.getAllUsers');

  getUserById = withErrorWrapper(async (userId: string): Promise<User | null> => {
    if (!userId) {
      throw ErrorFactory.validation('ID utilisateur requis');
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        logger.warn('user', 'Utilisateur non trouvé', { userId });
        return null;
      }

      const userData = { id: userDoc.id, ...userDoc.data() } as User;
      
      logger.debug('user', 'Utilisateur récupéré par ID', {
        userId,
        userRole: userData.role
      });
      
      return userData;
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la récupération de l\'utilisateur');
      }
      
      throw ErrorFactory.server('Erreur lors de la récupération de l\'utilisateur', error);
    }
  }, 'UserService.getUserById');

  updateUser = withErrorWrapper(async (userId: string, userData: Partial<User>): Promise<void> => {
    if (!userId) {
      throw ErrorFactory.validation('ID utilisateur requis');
    }

    if (!userData || Object.keys(userData).length === 0) {
      throw ErrorFactory.validation('Données de mise à jour requises');
    }

    try {
      logger.info('user', 'Mise à jour utilisateur', {
        userId,
        fieldsUpdated: Object.keys(userData)
      });
      
      const updateData = {
        ...userData,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      logger.info('user', 'Utilisateur mis à jour avec succès', {
        userId,
        fieldsUpdated: Object.keys(userData)
      });
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la mise à jour de l\'utilisateur');
      }
      
      throw ErrorFactory.server('Erreur lors de la mise à jour de l\'utilisateur', error);
    }
  }, 'UserService.updateUser');

  updateUserStatus = withErrorWrapper(async (userId: string, status: 'active' | 'suspended'): Promise<void> => {
    if (!userId) {
      throw ErrorFactory.validation('ID utilisateur requis');
    }

    if (!['active', 'suspended'].includes(status)) {
      throw ErrorFactory.validation('Statut invalide');
    }

    try {
      await updateDoc(doc(db, 'users', userId), { 
        status,
        updatedAt: new Date().toISOString()
      });
      
      logger.info('user', 'Statut utilisateur modifié', {
        userId,
        newStatus: status
      });
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la mise à jour du statut');
      }
      
      throw ErrorFactory.server('Erreur lors de la mise à jour du statut', error);
    }
  }, 'UserService.updateUserStatus');

  // Membres de famille avec gestion d'erreurs
  getFamilyMembers = withErrorWrapper(async (userId: string): Promise<FamilyMember[]> => {
    if (!userId) {
      throw ErrorFactory.validation('ID utilisateur requis');
    }

    try {
      const q = query(
        collection(db, 'familyMembers'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FamilyMember));
      
      // Trier en mémoire
      return members.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la récupération des membres de famille');
      }
      
      throw ErrorFactory.server('Erreur lors de la récupération des membres de famille', error);
    }
  }, 'UserService.getFamilyMembers');

  addFamilyMember = withErrorWrapper(async (memberData: Omit<FamilyMember, 'id' | 'createdAt'>): Promise<string> => {
    if (!memberData.userId) {
      throw ErrorFactory.validation('ID utilisateur requis');
    }

    this.validateFamilyMemberData(memberData);

    try {
      const docRef = await addDoc(collection(db, 'familyMembers'), {
        ...memberData,
        createdAt: new Date().toISOString()
      });
      
      logger.info('user', 'Membre de famille ajouté', {
        memberId: docRef.id,
        userId: memberData.userId,
        memberName: `${memberData.firstName} ${memberData.lastName}`
      });
      
      return docRef.id;
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de l\'ajout du membre de famille');
      }
      
      throw ErrorFactory.server('Erreur lors de l\'ajout du membre de famille', error);
    }
  }, 'UserService.addFamilyMember');

  // Services avec gestion d'erreurs
  getAllServices = withErrorWrapper(async (): Promise<Service[]> => {
    try {
      const q = query(collection(db, 'services'), orderBy('createdDate', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Service));
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la récupération des services');
      }
      
      throw ErrorFactory.server('Erreur lors de la récupération des services', error);
    }
  }, 'UserService.getAllServices');

  getActiveServices = withErrorWrapper(async (): Promise<Service[]> => {
    try {
      const q = query(
        collection(db, 'services'),
        where('isActive', '==', true),
        orderBy('name')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Service));
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la récupération des services actifs');
      }
      
      throw ErrorFactory.server('Erreur lors de la récupération des services actifs', error);
    }
  }, 'UserService.getActiveServices');

  // Demandes de service avec gestion d'erreurs
  getAllServiceRequests = withErrorWrapper(async (): Promise<ServiceRequest[]> => {
    try {
      const q = query(collection(db, 'serviceRequests'), orderBy('submissionDate', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceRequest));
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la récupération des demandes');
      }
      
      throw ErrorFactory.server('Erreur lors de la récupération des demandes', error);
    }
  }, 'UserService.getAllServiceRequests');

  getUserServiceRequests = withErrorWrapper(async (userId: string): Promise<ServiceRequest[]> => {
    if (!userId) {
      throw ErrorFactory.validation('ID utilisateur requis');
    }

    try {
      const q = query(
        collection(db, 'serviceRequests'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceRequest));
      
      // Trier en mémoire
      return requests.sort((a, b) => {
        const dateA = new Date(a.submissionDate).getTime();
        const dateB = new Date(b.submissionDate).getTime();
        return dateB - dateA;
      });
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la récupération des demandes utilisateur');
      }
      
      throw ErrorFactory.server('Erreur lors de la récupération des demandes utilisateur', error);
    }
  }, 'UserService.getUserServiceRequests');

  addServiceRequest = withErrorWrapper(async (requestData: Omit<ServiceRequest, 'id'>): Promise<string> => {
    this.validateServiceRequestData(requestData);

    try {
      logger.info('request', 'Nouvelle demande de service', {
        userId: requestData.userId,
        service: requestData.service,
        amount: requestData.amount,
        beneficiary: requestData.beneficiary
      });
      
      const docRef = await addDoc(collection(db, 'serviceRequests'), requestData);
      
      logger.info('request', 'Demande de service créée', {
        requestId: docRef.id,
        userId: requestData.userId,
        service: requestData.service,
        amount: requestData.amount
      });
      
      return docRef.id;
    } catch (error: any) {
      if (this.isFirestoreError(error)) {
        throw this.handleFirestoreError(error, 'Erreur lors de la création de la demande');
      }
      
      throw ErrorFactory.server('Erreur lors de la création de la demande', error);
    }
  }, 'UserService.addServiceRequest');

  // Méthodes de validation privées
  private validateFamilyMemberData(data: any): void {
    const errors: string[] = [];

    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.push('Prénom requis (minimum 2 caractères)');
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.push('Nom requis (minimum 2 caractères)');
    }

    if (!data.nip || !/^\d{13}$/.test(data.nip)) {
      errors.push('NIP doit contenir exactement 13 chiffres');
    }

    if (!data.relationship) {
      errors.push('Lien de parenté requis');
    }

    if (!data.birthDate) {
      errors.push('Date de naissance requise');
    } else {
      const birthDate = new Date(data.birthDate);
      const now = new Date();
      
      if (birthDate > now) {
        errors.push('La date de naissance ne peut pas être dans le futur');
      }
    }

    if (errors.length > 0) {
      throw ErrorFactory.validation('Données membre famille invalides', errors.join(', '));
    }
  }

  private validateServiceRequestData(data: any): void {
    const errors: string[] = [];

    if (!data.userId) errors.push('ID utilisateur requis');
    if (!data.serviceId) errors.push('Service requis');
    if (!data.beneficiary) errors.push('Bénéficiaire requis');
    if (!data.amount || data.amount <= 0) errors.push('Montant invalide');
    if (!data.paymentMethod) errors.push('Mode de paiement requis');
    if (!data.accountHolderName) errors.push('Nom du titulaire requis');

    if (data.paymentMethod === 'mobile' && !data.mobileNumber) {
      errors.push('Numéro mobile requis');
    }
    if (data.paymentMethod === 'bank' && !data.bankAccount) {
      errors.push('Numéro de compte bancaire requis');
    }

    if (data.amount > 10000000) {
      errors.push('Montant trop élevé (maximum 10 000 000 FCFA)');
    }

    if (errors.length > 0) {
      throw ErrorFactory.validation('Données demande invalides', errors.join(', '));
    }
  }

  // Gestion des erreurs Firestore
  private isFirestoreError(error: any): error is FirestoreError {
    return error && error.code && typeof error.code === 'string';
  }

  private handleFirestoreError(error: FirestoreError, defaultMessage: string) {
    switch (error.code) {
      case 'permission-denied':
        return ErrorFactory.authorization('Permissions insuffisantes pour cette opération');
      case 'not-found':
        return ErrorFactory.notFound('Ressource');
      case 'unavailable':
        return ErrorFactory.network('Service temporairement indisponible', error);
      case 'deadline-exceeded':
        return ErrorFactory.network('Délai d\'attente dépassé', error);
      case 'resource-exhausted':
        return ErrorFactory.server('Limite de ressources atteinte', error);
      default:
        return ErrorFactory.firebase(error.code, defaultMessage, error);
    }
  }

  // Méthodes existantes avec gestion d'erreurs (versions simplifiées)
  updateFamilyMember = withErrorWrapper(async (memberId: string, memberData: Partial<FamilyMember>): Promise<void> => {
    await updateDoc(doc(db, 'familyMembers', memberId), memberData);
  }, 'UserService.updateFamilyMember');

  deleteFamilyMember = withErrorWrapper(async (memberId: string): Promise<void> => {
    await deleteDoc(doc(db, 'familyMembers', memberId));
  }, 'UserService.deleteFamilyMember');

  addService = withErrorWrapper(async (serviceData: Omit<Service, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'services'), serviceData);
    return docRef.id;
  }, 'UserService.addService');

  updateService = withErrorWrapper(async (serviceId: string, serviceData: Partial<Service>): Promise<void> => {
    await updateDoc(doc(db, 'services', serviceId), serviceData);
  }, 'UserService.updateService');

  deleteService = withErrorWrapper(async (serviceId: string): Promise<void> => {
    await deleteDoc(doc(db, 'services', serviceId));
  }, 'UserService.deleteService');

  updateServiceRequest = withErrorWrapper(async (requestId: string, requestData: Partial<ServiceRequest>): Promise<void> => {
    await updateDoc(doc(db, 'serviceRequests', requestId), requestData);
  }, 'UserService.updateServiceRequest');

  updateRequestStatus = withErrorWrapper(async (
    requestId: string, 
    status: 'approved' | 'rejected', 
    comments?: string,
    reviewedBy?: string
  ): Promise<void> => {
    await updateDoc(doc(db, 'serviceRequests', requestId), {
      status,
      comments,
      reviewedBy,
      responseDate: new Date().toISOString()
    });
  }, 'UserService.updateRequestStatus');

  // Listeners en temps réel avec gestion d'erreurs
  subscribeToUserRequests(userId: string, callback: (requests: ServiceRequest[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'serviceRequests'),
      where('userId', '==', userId)
    );
    
    return onSnapshot(q, 
      (querySnapshot) => {
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ServiceRequest));
        
        const sortedRequests = requests.sort((a, b) => {
          const dateA = new Date(a.submissionDate).getTime();
          const dateB = new Date(b.submissionDate).getTime();
          return dateB - dateA;
        });
        
        callback(sortedRequests);
      },
      (error) => {
        handleError(ErrorFactory.firebase(error.code, 'Erreur de synchronisation des demandes', error));
      }
    );
  }

  subscribeToAllRequests(callback: (requests: ServiceRequest[]) => void): Unsubscribe {
    const q = query(collection(db, 'serviceRequests'), orderBy('submissionDate', 'desc'));
    
    return onSnapshot(q,
      (querySnapshot) => {
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ServiceRequest));
        callback(requests);
      },
      (error) => {
        handleError(ErrorFactory.firebase(error.code, 'Erreur de synchronisation des demandes', error));
      }
    );
  }

  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q,
      (querySnapshot) => {
        const notifications = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
        callback(notifications);
      },
      (error) => {
        handleError(ErrorFactory.firebase(error.code, 'Erreur de synchronisation des notifications', error));
      }
    );
  }

  // Méthodes utilitaires
  getUserNotifications = withErrorWrapper(async (userId: string): Promise<Notification[]> => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  }, 'UserService.getUserNotifications');

  addNotification = withErrorWrapper(async (notificationData: Omit<Notification, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  }, 'UserService.addNotification');

  markNotificationAsRead = withErrorWrapper(async (notificationId: string): Promise<void> => {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  }, 'UserService.markNotificationAsRead');
}

export const enhancedUserService = new EnhancedUserService();