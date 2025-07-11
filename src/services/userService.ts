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
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, FamilyMember, Service, ServiceRequest, Notification } from '../types';
import { logger, performanceLogger } from '../utils/logger';

export const userService = {
  // Utilisateurs
  async getAllUsers(): Promise<User[]> {
    try {
      const timer = performanceLogger.startTimer('getAllUsers');
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
    } catch (error) {
      logger.error('user', 'Erreur lors de la récupération des utilisateurs', {
        error: error.message
      }, error as Error);
      throw error;
    }
  },

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as User;
        logger.debug('user', 'Utilisateur récupéré par ID', {
          userId,
          userRole: userData.role
        });
        return userData;
      }
      logger.warn('user', 'Utilisateur non trouvé', { userId });
      return null;
    } catch (error) {
      logger.error('user', 'Erreur lors de la récupération de l\'utilisateur', {
        userId,
        error: error.message
      }, error as Error);
      throw error;
    }
  },

  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      logger.logUserAction('Mise à jour utilisateur', {
        userId,
        fieldsUpdated: Object.keys(userData)
      });
      
      // Préparer les données pour Firestore
      const updateData = {
        ...userData,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      logger.info('user', 'Utilisateur mis à jour dans Firestore', {
        userId,
        fieldsUpdated: Object.keys(userData)
      });
    } catch (error) {
      logger.error('user', 'Erreur lors de la mise à jour de l\'utilisateur', {
        userId,
        fieldsUpdated: Object.keys(userData),
        error: error.message
      }, error as Error);
      throw new Error('Impossible de mettre à jour les informations utilisateur');
    }
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
      logger.logUserAction('Statut utilisateur modifié', {
        userId,
        newStatus: status
      });
    } catch (error) {
      logger.error('user', 'Erreur lors de la mise à jour du statut', {
        userId,
        status,
        error: error.message
      }, error as Error);
      throw error;
    }
  },

  // Membres de famille
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    try {
      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, 'familyMembers'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FamilyMember));
      
      // Sort in memory instead of using Firestore orderBy
      return members.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // desc order
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des membres de famille:', error);
      throw error;
    }
  },

  async addFamilyMember(memberData: Omit<FamilyMember, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'familyMembers'), {
        ...memberData,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre de famille:', error);
      throw error;
    }
  },

  async updateFamilyMember(memberId: string, memberData: Partial<FamilyMember>): Promise<void> {
    try {
      await updateDoc(doc(db, 'familyMembers', memberId), memberData);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du membre de famille:', error);
      throw error;
    }
  },

  async deleteFamilyMember(memberId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'familyMembers', memberId));
    } catch (error) {
      console.error('Erreur lors de la suppression du membre de famille:', error);
      throw error;
    }
  },

  // Services
  async getAllServices(): Promise<Service[]> {
    try {
      const q = query(collection(db, 'services'), orderBy('createdDate', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Service));
    } catch (error) {
      console.error('Erreur lors de la récupération des services:', error);
      throw error;
    }
  },

  async getActiveServices(): Promise<Service[]> {
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
    } catch (error) {
      console.error('Erreur lors de la récupération des services actifs:', error);
      throw error;
    }
  },

  async addService(serviceData: Omit<Service, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'services'), serviceData);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du service:', error);
      throw error;
    }
  },

  async updateService(serviceId: string, serviceData: Partial<Service>): Promise<void> {
    try {
      await updateDoc(doc(db, 'services', serviceId), serviceData);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du service:', error);
      throw error;
    }
  },

  async deleteService(serviceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'services', serviceId));
    } catch (error) {
      console.error('Erreur lors de la suppression du service:', error);
      throw error;
    }
  },

  // Demandes de service
  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    try {
      const q = query(collection(db, 'serviceRequests'), orderBy('submissionDate', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceRequest));
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes:', error);
      throw error;
    }
  },

  async getUserServiceRequests(userId: string): Promise<ServiceRequest[]> {
    try {
      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, 'serviceRequests'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceRequest));
      
      // Sort in memory instead of using Firestore orderBy
      return requests.sort((a, b) => {
        const dateA = new Date(a.submissionDate).getTime();
        const dateB = new Date(b.submissionDate).getTime();
        return dateB - dateA; // desc order
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes utilisateur:', error);
      throw error;
    }
  },

  async addServiceRequest(requestData: Omit<ServiceRequest, 'id'>): Promise<string> {
    try {
      logger.logBusinessEvent('Nouvelle demande de service', {
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
    } catch (error) {
      logger.error('request', 'Erreur lors de l\'ajout de la demande', {
        userId: requestData.userId,
        service: requestData.service,
        error: error.message
      }, error as Error);
      throw error;
    }
  },

  async updateServiceRequest(requestId: string, requestData: Partial<ServiceRequest>): Promise<void> {
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), requestData);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la demande:', error);
      throw error;
    }
  },

  async updateRequestStatus(
    requestId: string, 
    status: 'approved' | 'rejected', 
    comments?: string,
    reviewedBy?: string
  ): Promise<void> {
    try {
      logger.logBusinessEvent('Statut de demande modifié', {
        requestId,
        newStatus: status,
        reviewedBy,
        hasComments: !!comments
      });
      
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status,
        comments,
        reviewedBy,
        responseDate: new Date().toISOString()
      });
      
      logger.info('request', 'Statut de demande mis à jour', {
        requestId,
        status,
        reviewedBy
      });
    } catch (error) {
      logger.error('request', 'Erreur lors de la mise à jour du statut', {
        requestId,
        status,
        error: error.message
      }, error as Error);
      throw error;
    }
  },

  // Notifications
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
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
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  },

  async addNotification(notificationData: Omit<Notification, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la notification:', error);
      throw error;
    }
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
      throw error;
    }
  },

  // Listeners en temps réel
  subscribeToUserRequests(userId: string, callback: (requests: ServiceRequest[]) => void): Unsubscribe {
    // Simplified query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, 'serviceRequests'),
      where('userId', '==', userId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceRequest));
      
      // Sort in memory instead of using Firestore orderBy
      const sortedRequests = requests.sort((a, b) => {
        const dateA = new Date(a.submissionDate).getTime();
        const dateB = new Date(b.submissionDate).getTime();
        return dateB - dateA; // desc order
      });
      
      callback(sortedRequests);
    });
  },

  subscribeToAllRequests(callback: (requests: ServiceRequest[]) => void): Unsubscribe {
    const q = query(collection(db, 'serviceRequests'), orderBy('submissionDate', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceRequest));
      callback(requests);
    });
  },

  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    });
  }
};