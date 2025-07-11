import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function FirebaseStatus() {
  const [authStatus, setAuthStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    // Vérifier la connexion Auth
    const checkAuth = () => {
      if (auth.currentUser) {
        setAuthStatus('connected');
      } else {
        setAuthStatus('disconnected');
      }
    };

    // Vérifier la connexion Firestore
    const checkFirestore = async () => {
      try {
        // Essayer de lire un document test
        await getDoc(doc(db, 'test', 'connection'));
        setFirestoreStatus('connected');
      } catch (error) {
        console.error('Erreur de connexion Firestore:', error);
        setFirestoreStatus('disconnected');
      }
    };

    checkAuth();
    checkFirestore();

    // Écouter les changements d'authentification
    const unsubscribe = auth.onAuthStateChanged(() => {
      checkAuth();
    });

    return () => unsubscribe();
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return null; // Ne pas afficher en production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <h3 className="text-sm font-medium text-gray-900 mb-2">État Firebase</h3>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          {authStatus === 'connected' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : authStatus === 'disconnected' ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          )}
          <span className="text-xs text-gray-600">
            Auth: {authStatus === 'checking' ? 'Vérification...' : authStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {firestoreStatus === 'connected' ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : firestoreStatus === 'disconnected' ? (
            <WifiOff className="h-4 w-4 text-red-500" />
          ) : (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          )}
          <span className="text-xs text-gray-600">
            Firestore: {firestoreStatus === 'checking' ? 'Vérification...' : firestoreStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
      </div>
    </div>
  );
}