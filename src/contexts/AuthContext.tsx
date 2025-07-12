import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { User } from '../types';

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
      
      if (firebaseUser) {
        try {
          // Récupérer les données utilisateur complètes depuis Firestore
          const userData = await userService.getUserById(firebaseUser.uid);
          if (userData) {
            setUser(userData);
          } else {
            // Si l'utilisateur n'existe pas dans Firestore, le déconnecter
            await authService.logout();
            setUser(null);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const userData = await authService.login(email, password);
      if (userData) {
        setUser(userData);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      await authService.resetPassword(email);
      return true;
    } catch (error: any) {
      console.error('Erreur de réinitialisation:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      
      // Mettre à jour l'utilisateur local
      if (user) {
        const updatedUser = { ...user, firstLogin: false };
        setUser(updatedUser);
      }
      
      return true;
    } catch (error: any) {
      console.error('Erreur de changement de mot de passe:', error);
      throw error;
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    if (!user) throw new Error('Utilisateur non connecté');
    
    try {
      // Mettre à jour dans Firestore
      await userService.updateUser(user.id, {
        ...userData,
        updatedAt: new Date()
      });
      
      // Mettre à jour l'état local avec les nouvelles données
      const updatedUser = { ...user, ...userData, updatedAt: new Date() };
      setUser(updatedUser);
      
      console.log('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur de mise à jour du profil:', error);
      throw new Error('Erreur lors de la mise à jour du profil');
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