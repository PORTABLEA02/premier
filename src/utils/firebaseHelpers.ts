import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Helper pour créer des documents avec timestamp automatique
export const createDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error(`Erreur lors de la création du document dans ${collectionName}:`, error);
    throw error;
  }
};

// Helper pour mettre à jour des documents
export const updateDocument = async (collectionName: string, docId: string, data: any) => {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du document ${docId}:`, error);
    throw error;
  }
};

// Helper pour supprimer des documents
export const deleteDocument = async (collectionName: string, docId: string) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    console.error(`Erreur lors de la suppression du document ${docId}:`, error);
    throw error;
  }
};

// Helper pour récupérer un document par ID
export const getDocumentById = async (collectionName: string, docId: string) => {
  try {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Erreur lors de la récupération du document ${docId}:`, error);
    throw error;
  }
};

// Helper pour récupérer tous les documents d'une collection
export const getAllDocuments = async (collectionName: string, orderByField?: string) => {
  try {
    let q = collection(db, collectionName);
    
    if (orderByField) {
      q = query(collection(db, collectionName), orderBy(orderByField, 'desc')) as any;
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Erreur lors de la récupération des documents de ${collectionName}:`, error);
    throw error;
  }
};

// Helper pour les requêtes avec conditions
export const getDocumentsWhere = async (
  collectionName: string, 
  field: string, 
  operator: any, 
  value: any,
  orderByField?: string,
  limitCount?: number
) => {
  try {
    let q = query(collection(db, collectionName), where(field, operator, value));
    
    if (orderByField) {
      q = query(q, orderBy(orderByField, 'desc'));
    }
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Erreur lors de la requête sur ${collectionName}:`, error);
    throw error;
  }
};

// Helper pour convertir les timestamps Firebase
export const convertTimestamp = (timestamp: any) => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return timestamp;
};

// Helper pour formater les données avant sauvegarde
export const prepareDataForFirestore = (data: any) => {
  const prepared = { ...data };
  
  // Convertir les dates en timestamps
  Object.keys(prepared).forEach(key => {
    if (prepared[key] instanceof Date) {
      prepared[key] = Timestamp.fromDate(prepared[key]);
    }
  });
  
  return prepared;
};