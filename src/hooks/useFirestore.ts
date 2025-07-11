import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Hook pour écouter les changements d'un document
export const useDocument = (collectionName: string, docId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, collectionName, docId),
      (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() });
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Erreur Firestore:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading, error };
};

// Hook pour écouter les changements d'une collection
export const useCollection = (
  collectionName: string, 
  conditions?: Array<{ field: string; operator: any; value: any }>,
  orderByField?: string
) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = collection(db, collectionName);

    // Ajouter les conditions where
    if (conditions && conditions.length > 0) {
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value)) as any;
      });
    }

    // Ajouter l'ordre
    if (orderByField) {
      q = query(q, orderBy(orderByField, 'desc')) as any;
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const documents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(documents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Erreur Firestore:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(conditions), orderByField]);

  return { data, loading, error };
};

// Hook pour les demandes de service d'un utilisateur
export const useUserRequests = (userId: string) => {
  return useCollection(
    'serviceRequests',
    [{ field: 'userId', operator: '==', value: userId }],
    'submissionDate'
  );
};

// Hook pour les membres de famille d'un utilisateur
export const useFamilyMembers = (userId: string) => {
  return useCollection(
    'familyMembers',
    [{ field: 'userId', operator: '==', value: userId }],
    'createdAt'
  );
};

// Hook pour les notifications d'un utilisateur
export const useUserNotifications = (userId: string) => {
  return useCollection(
    'notifications',
    [{ field: 'userId', operator: '==', value: userId }],
    'createdAt'
  );
};

// Hook pour tous les services actifs
export const useActiveServices = () => {
  return useCollection(
    'services',
    [{ field: 'isActive', operator: '==', value: true }],
    'name'
  );
};