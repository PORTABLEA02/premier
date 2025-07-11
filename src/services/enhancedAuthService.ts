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
  AuthError
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import { handleError, ErrorFactory, withErrorWrapper } from '../utils/errorHandler';
import { logger } from '../utils/logger';

class EnhancedAuthService {
  // Connexion avec gestion d'erreurs améliorée
  login = withErrorWrapper(async (email: string, password: string): Promise<User | null> => {
    if (!email || !password) {
      throw ErrorFactory.validation('Email et mot de passe requis', 'Veuillez saisir votre email et mot de passe');
    }

    if (!this.isValidEmail(email)) {
      throw ErrorFactory.validation('Format email invalide', 'Veuillez saisir une adresse email valide');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Récupérer les données utilisateur depuis Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw ErrorFactory.notFound('Utilisateur', firebaseUser.uid);
      }

      const userData = userDoc.data() as User;
      
      // Vérifier le statut du compte
      if (userData.status === 'suspended') {
        await signOut(auth); // Déconnecter immédiatement
        throw ErrorFactory.authorization('Compte suspendu. Contactez l\'administrateur.');
      }
      
      // Mettre à jour la dernière connexion
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        lastLogin: new Date().toISOString(),
        updatedAt: new Date()
      });
      
      logger.info('auth', 'Connexion réussie', {
        userId: firebaseUser.uid,
        email: userData.email,
        role: userData.role
      });
      
      return {
        ...userData,
        id: firebaseUser.uid
      };
      
    } catch (error: any) {
      // Gérer les erreurs Firebase spécifiques
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            throw ErrorFactory.authentication(
              'Identifiants incorrects',
              error.code,
              error
            );
          case 'auth/too-many-requests':
            throw ErrorFactory.authentication(
              'Trop de tentatives de connexion. Réessayez plus tard.',
              error.code,
              error
            );
          case 'auth/user-disabled':
            throw ErrorFactory.authorization('Ce compte a été désactivé');
          default:
            throw ErrorFactory.firebase(error.code, error.message, error);
        }
      }
      
      throw error;
    }
  }, 'AuthService.login');

  // Déconnexion avec gestion d'erreurs
  logout = withErrorWrapper(async (): Promise<void> => {
    try {
      const currentUser = auth.currentUser;
      await signOut(auth);
      
      logger.info('auth', 'Déconnexion réussie', {
        userId: currentUser?.uid
      });
    } catch (error: any) {
      throw ErrorFactory.firebase(error.code || 'auth/signout-error', error.message, error);
    }
  }, 'AuthService.logout');

  // Création d'utilisateur avec gestion d'erreurs améliorée
  createUser = withErrorWrapper(async (
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'firstLogin'>, 
    password: string
  ): Promise<User> => {
    // Validation des données
    this.validateUserData(userData);
    this.validatePassword(password);

    try {
      // Créer l'utilisateur Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
      const firebaseUser = userCredential.user;
      
      const newUser: User = {
        ...userData,
        id: firebaseUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        firstLogin: true,
        status: 'active'
      };
      
      // Sauvegarder dans Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...newUser,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString()
      });

      // Déconnecter l'utilisateur créé pour éviter qu'il reste connecté
      await signOut(auth);
      
      logger.info('auth', 'Utilisateur créé avec succès', {
        userId: firebaseUser.uid,
        email: userData.email,
        role: userData.role
      });
      
      return newUser;
      
    } catch (error: any) {
      // Nettoyer en cas d'erreur
      try {
        await signOut(auth);
      } catch (signOutError) {
        logger.warn('auth', 'Erreur lors de la déconnexion après échec de création', {
          error: signOutError
        });
      }
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            throw ErrorFactory.validation(
              'Email déjà utilisé',
              'Cette adresse email est déjà associée à un compte'
            );
          case 'auth/weak-password':
            throw ErrorFactory.validation(
              'Mot de passe trop faible',
              'Le mot de passe doit contenir au moins 6 caractères'
            );
          case 'auth/invalid-email':
            throw ErrorFactory.validation(
              'Email invalide',
              'Veuillez saisir une adresse email valide'
            );
          default:
            throw ErrorFactory.firebase(error.code, error.message, error);
        }
      }
      
      throw error;
    }
  }, 'AuthService.createUser');

  // Réinitialisation de mot de passe avec gestion d'erreurs
  resetPassword = withErrorWrapper(async (email: string): Promise<void> => {
    if (!email) {
      throw ErrorFactory.validation('Email requis', 'Veuillez saisir votre adresse email');
    }

    if (!this.isValidEmail(email)) {
      throw ErrorFactory.validation('Email invalide', 'Veuillez saisir une adresse email valide');
    }

    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false
      });
      
      logger.info('auth', 'Email de réinitialisation envoyé', { email });
      
    } catch (error: any) {
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            throw ErrorFactory.notFound('Utilisateur avec cet email');
          case 'auth/invalid-email':
            throw ErrorFactory.validation('Email invalide', 'Veuillez saisir une adresse email valide');
          case 'auth/too-many-requests':
            throw ErrorFactory.authentication(
              'Trop de demandes de réinitialisation. Réessayez plus tard.',
              error.code,
              error
            );
          default:
            throw ErrorFactory.firebase(error.code, error.message, error);
        }
      }
      
      throw error;
    }
  }, 'AuthService.resetPassword');

  // Changement de mot de passe avec gestion d'erreurs
  changePassword = withErrorWrapper(async (currentPassword: string, newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw ErrorFactory.authentication('Utilisateur non connecté');
    }

    if (!currentPassword || !newPassword) {
      throw ErrorFactory.validation(
        'Mots de passe requis',
        'Veuillez saisir le mot de passe actuel et le nouveau mot de passe'
      );
    }

    this.validatePassword(newPassword);

    try {
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
      
      logger.info('auth', 'Mot de passe changé avec succès', {
        userId: user.uid
      });
      
    } catch (error: any) {
      if (error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
            throw ErrorFactory.authentication(
              'Mot de passe actuel incorrect',
              error.code,
              error
            );
          case 'auth/weak-password':
            throw ErrorFactory.validation(
              'Nouveau mot de passe trop faible',
              'Le nouveau mot de passe doit contenir au moins 6 caractères'
            );
          case 'auth/requires-recent-login':
            throw ErrorFactory.authentication(
              'Veuillez vous reconnecter pour changer votre mot de passe',
              error.code,
              error
            );
          default:
            throw ErrorFactory.firebase(error.code, error.message, error);
        }
      }
      
      throw error;
    }
  }, 'AuthService.changePassword');

  // Validation des données utilisateur
  private validateUserData(userData: any): void {
    const errors: string[] = [];

    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Adresse email invalide');
    }

    if (!userData.role || !['admin', 'member'].includes(userData.role)) {
      errors.push('Rôle invalide');
    }

    if (userData.phone && !this.isValidPhone(userData.phone)) {
      errors.push('Numéro de téléphone invalide');
    }

    if (errors.length > 0) {
      throw ErrorFactory.validation('Données utilisateur invalides', errors.join(', '));
    }
  }

  // Validation du mot de passe
  private validatePassword(password: string): void {
    const errors: string[] = [];

    if (!password) {
      errors.push('Mot de passe requis');
    } else {
      if (password.length < 6) {
        errors.push('Au moins 6 caractères');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Au moins une majuscule');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Au moins une minuscule');
      }
      if (!/\d/.test(password)) {
        errors.push('Au moins un chiffre');
      }
    }

    if (errors.length > 0) {
      throw ErrorFactory.validation('Mot de passe invalide', errors.join(', '));
    }
  }

  // Validation email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validation téléphone
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{8,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Obtenir l'utilisateur actuel
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  // Obtenir le token d'authentification
  getAuthToken = withErrorWrapper(async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    try {
      return await user.getIdToken();
    } catch (error: any) {
      throw ErrorFactory.firebase(error.code || 'auth/token-error', error.message, error);
    }
  }, 'AuthService.getAuthToken');
}

export const enhancedAuthService = new EnhancedAuthService();