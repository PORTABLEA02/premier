import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { enhancedAuthService } from '../services/enhancedAuthService';
import { enhancedUserService } from '../services/enhancedUserService';
import { User } from '../types';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      logger.debug('auth', 'État d\'authentification changé', {
        hasUser: !!firebaseUser,
        userId: firebaseUser?.uid
      });
      
      if (firebaseUser) {
        try {
          // Récupérer les données utilisateur complètes depuis Firestore
          const userData = await enhancedUserService.getUserById(firebaseUser.uid);
          if (userData) {
            setUser(userData);
            logger.setUser(userData.id, userData.email, userData.role);
            logger.logAuthEvent('Utilisateur connecté', {
              userId: userData.id,
              role: userData.role
            });
          } else {
            // Si l'utilisateur n'existe pas dans Firestore, le déconnecter
            logger.warn('auth', 'Utilisateur Firebase sans données Firestore', {
              firebaseUid: firebaseUser.uid
            });
            await authService.logout();
            setUser(null);
          }
        } catch (error) {
          await handleError(error as Error, { action: 'getUserData', firebaseUid: firebaseUser.uid });
          setUser(null);
        }
      } else {
        logger.clearUser();
        logger.logAuthEvent('Utilisateur déconnecté');
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      logger.logAuthEvent('Tentative de connexion', { email });
      
      const userData = await enhancedAuthService.login(email, password);
      if (userData) {
        setUser(userData);
        logger.setUser(userData.id, userData.email, userData.role);
        logger.logAuthEvent('Connexion réussie', {
          userId: userData.id,
          role: userData.role
        });
        return true;
      }
      logger.warn('auth', 'Connexion échouée - données utilisateur manquantes', { email });
      return false;
    } catch (error: any) {
      await handleError(error, { action: 'login', email });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      const currentUserId = user?.id;
      logger.logAuthEvent('Déconnexion initiée', { userId: currentUserId });
      
      await enhancedAuthService.logout();
      setUser(null);
      logger.clearUser();
      logger.logAuthEvent('Déconnexion réussie', { userId: currentUserId });
    } catch (error) {
      await handleError(error as Error, { action: 'logout', userId: user?.id });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      logger.logAuthEvent('Demande de réinitialisation de mot de passe', { email });
      await enhancedAuthService.resetPassword(email);
      logger.logAuthEvent('Email de réinitialisation envoyé', { email });
      return true;
    } catch (error: any) {
      await handleError(error, { action: 'resetPassword', email });
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      logger.logAuthEvent('Changement de mot de passe initié', {
        userId: user?.id
      });
      
      await enhancedAuthService.changePassword(currentPassword, newPassword);
      
      // Mettre à jour l'utilisateur local
      if (user) {
        const updatedUser = { ...user, firstLogin: false };
        setUser(updatedUser);
        logger.logAuthEvent('Mot de passe changé avec succès', {
          userId: user.id,
          firstLogin: user.firstLogin
        });
      }
      
      return true;
    } catch (error: any) {
      await handleError(error, { action: 'changePassword', userId: user?.id });
      throw error;
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    if (!user) throw new Error('Utilisateur non connecté');
    
    try {
      logger.logUserAction('Mise à jour du profil initiée', {
        userId: user.id,
        fieldsUpdated: Object.keys(userData)
      });
      
      // Mettre à jour dans Firestore
      await enhancedUserService.updateUser(user.id, {
        ...userData,
        updatedAt: new Date()
      });
      
      // Mettre à jour l'état local avec les nouvelles données
      const updatedUser = { ...user, ...userData, updatedAt: new Date() };
      setUser(updatedUser);
      
      logger.logUserAction('Profil mis à jour avec succès', {
        userId: user.id,
        fieldsUpdated: Object.keys(userData)
      });
    } catch (error) {
      await handleError(error as Error, { action: 'updateProfile', userId: user?.id });
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    resetPassword,
    changePassword,
    updateProfile,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}