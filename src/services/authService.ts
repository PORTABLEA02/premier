import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  getAuth,
  connectAuthEmulator
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';

// Configuration Firebase pour l'importation (instance séparée)
const firebaseConfig = {
  apiKey: "AIzaSyBkzpvB9F2d_mlKo7IAzTL6hOAYn_fCRI8",
  authDomain: "musaib-fda27.firebaseapp.com",
  projectId: "musaib-fda27",
  storageBucket: "musaib-fda27.firebasestorage.app",
  messagingSenderId: "228939211863",
  appId: "1:228939211863:web:f188b71800039909ccef12"
};

// Instance Firebase séparée pour l'importation
const importApp = initializeApp(firebaseConfig, 'import-app');
const importAuth = getAuth(importApp);
const importDb = getFirestore(importApp);

export const authService = {
  // Connexion
  async login(email: string, password: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Récupérer les données utilisateur depuis Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        
        // Mettre à jour la dernière connexion
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          lastLogin: new Date().toISOString(),
          updatedAt: new Date()
        });
        
        return {
          ...userData,
          id: firebaseUser.uid
        };
      }
      
      return null;
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      
      // Gestion des erreurs spécifiques Firebase
      switch (error.code) {
        case 'auth/invalid-credential':
          throw new Error('Email ou mot de passe incorrect');
        case 'auth/user-not-found':
          throw new Error('Aucun utilisateur trouvé avec cet email');
        case 'auth/wrong-password':
          throw new Error('Mot de passe incorrect');
        case 'auth/invalid-email':
          throw new Error('Format d\'email invalide');
        case 'auth/user-disabled':
          throw new Error('Ce compte a été désactivé');
        case 'auth/too-many-requests':
          throw new Error('Trop de tentatives. Réessayez plus tard');
        default:
          throw new Error('Erreur de connexion');
      }
    }
  },

  // Déconnexion
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw new Error('Erreur lors de la déconnexion');
    }
  },

  // Créer un utilisateur (admin seulement)
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'firstLogin'>, password: string): Promise<User> {
    try {
      // Utiliser l'instance d'authentification séparée pour éviter de déconnecter l'admin
      const userCredential = await createUserWithEmailAndPassword(importAuth, userData.email, password);
      const firebaseUser = userCredential.user;
      
      const newUser: User = {
        ...userData,
        id: firebaseUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        firstLogin: true,
        status: 'active'
      };
      
      // Sauvegarder dans Firestore en utilisant l'instance principale
      await setDoc(doc(importDb, 'users', firebaseUser.uid), {
        ...newUser,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString()
      });

      // Déconnecter immédiatement l'utilisateur créé de l'instance d'importation
      // pour éviter qu'il reste connecté
      await importAuth.signOut();
      
      return newUser;
    } catch (error: any) {
      console.error('Erreur de création d\'utilisateur:', error);
      
      // S'assurer de déconnecter en cas d'erreur aussi
      try {
        await importAuth.signOut();
      } catch (signOutError) {
        console.error('Erreur lors de la déconnexion après échec:', signOutError);
      }
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('Cet email est déjà utilisé');
        case 'auth/invalid-email':
          throw new Error('Format d\'email invalide');
        case 'auth/weak-password':
          throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        case 'auth/operation-not-allowed':
          throw new Error('Création de compte désactivée');
        case 'auth/too-many-requests':
          throw new Error('Trop de tentatives. Réessayez plus tard');
        default:
          throw new Error('Erreur lors de la création du compte');
      }
    }
  },

  // Réinitialiser le mot de passe
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false
      });
    } catch (error: any) {
      console.error('Erreur de réinitialisation:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          throw new Error('Aucun utilisateur trouvé avec cet email');
        case 'auth/invalid-email':
          throw new Error('Format d\'email invalide');
        default:
          throw new Error('Erreur lors de l\'envoi de l\'email');
      }
    }
  },

  // Changer le mot de passe avec réauthentification
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Utilisateur non connecté');
      
      // Réauthentifier l'utilisateur
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Changer le mot de passe
      await updatePassword(user, newPassword);
      
      // Marquer que ce n'est plus la première connexion
      await updateDoc(doc(db, 'users', user.uid), {
        firstLogin: false,
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Erreur de changement de mot de passe:', error);
      
      switch (error.code) {
        case 'auth/wrong-password':
          throw new Error('Mot de passe actuel incorrect');
        case 'auth/weak-password':
          throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
        case 'auth/requires-recent-login':
          throw new Error('Veuillez vous reconnecter pour changer votre mot de passe');
        default:
          throw new Error('Erreur lors du changement de mot de passe');
      }
    }
  },

  // Obtenir l'utilisateur actuel
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  },

  // Obtenir le token d'authentification
  async getAuthToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  }
};