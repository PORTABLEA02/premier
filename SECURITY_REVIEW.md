# Revue de Sécurité - Application MuSAIB

## 🔍 Vue d'ensemble
Cette revue examine les aspects de sécurité de l'application de gestion mutualiste MuSAIB, identifie les vulnérabilités potentielles et propose des améliorations.

## ✅ Points Forts Identifiés

### 1. Authentification Firebase
- ✅ Utilisation de Firebase Auth (service sécurisé)
- ✅ Gestion des erreurs d'authentification appropriée
- ✅ Réauthentification pour le changement de mot de passe
- ✅ Déconnexion automatique en cas d'erreur

### 2. Gestion des Rôles
- ✅ Séparation claire admin/membre
- ✅ Routes protégées par rôle
- ✅ Vérification côté client des permissions

### 3. Validation des Données
- ✅ Validation côté client avec react-hook-form
- ✅ Validation des formats email, téléphone, etc.
- ✅ Contraintes sur les montants et champs obligatoires

## 🚨 Vulnérabilités Critiques Identifiées

### 1. **CRITIQUE - Absence de Règles de Sécurité Firestore**
```javascript
// PROBLÈME: Aucune règle de sécurité Firestore définie
// Tous les utilisateurs peuvent potentiellement accéder à toutes les données
```
**Impact**: Accès non autorisé aux données sensibles
**Priorité**: CRITIQUE

### 2. **CRITIQUE - Validation Côté Serveur Manquante**
```javascript
// PROBLÈME: Validation uniquement côté client
// Un attaquant peut contourner la validation frontend
```
**Impact**: Injection de données malveillantes
**Priorité**: CRITIQUE

### 3. **ÉLEVÉ - Exposition d'Informations Sensibles**
```javascript
// PROBLÈME: Logs contenant des données sensibles
console.error('Erreur de connexion:', error);
console.log('Utilisateur créé:', userData);
```
**Impact**: Fuite d'informations dans les logs
**Priorité**: ÉLEVÉ

### 4. **ÉLEVÉ - Gestion des Fichiers Non Sécurisée**
```javascript
// PROBLÈME: Pas de validation des types de fichiers côté serveur
// Pas de scan antivirus, pas de limite de taille stricte
```
**Impact**: Upload de fichiers malveillants
**Priorité**: ÉLEVÉ

## 🔒 Recommandations de Sécurité

### 1. Règles de Sécurité Firestore (CRITIQUE)
```javascript
// rules/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utilisateurs - accès restreint
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Demandes de service - accès utilisateur + admin
    match /serviceRequests/{requestId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Services - lecture pour tous, écriture admin seulement
    match /services/{serviceId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Membres famille - accès utilisateur seulement
    match /familyMembers/{memberId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 2. Validation Côté Serveur avec Cloud Functions
```javascript
// functions/src/validateServiceRequest.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.validateServiceRequest = functions.firestore
  .document('serviceRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    // Validation des données
    if (!data.amount || data.amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Montant invalide');
    }
    
    // Vérifier les limites du service
    const service = await admin.firestore()
      .collection('services')
      .doc(data.serviceId)
      .get();
      
    if (data.amount > service.data().maxAmount) {
      throw new functions.https.HttpsError('invalid-argument', 'Montant dépasse la limite');
    }
    
    // Validation des fichiers
    if (!data.documents || data.documents.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Documents requis');
    }
  });
```

### 3. Sécurisation des Logs
```javascript
// utils/secureLogger.js
export const secureLogger = {
  info: (message, data = {}) => {
    // Masquer les données sensibles
    const sanitized = sanitizeData(data);
    console.log(message, sanitized);
  },
  
  error: (message, error) => {
    // Ne pas logger les détails sensibles en production
    if (process.env.NODE_ENV === 'production') {
      console.error(message, { code: error.code });
    } else {
      console.error(message, error);
    }
  }
};

const sanitizeData = (data) => {
  const sensitive = ['password', 'email', 'phone', 'nip', 'bankAccount'];
  const sanitized = { ...data };
  
  sensitive.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***MASKED***';
    }
  });
  
  return sanitized;
};
```

### 4. Validation et Sécurisation des Fichiers
```javascript
// utils/fileValidation.js
export const validateFile = (file) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Type de fichier non autorisé');
  }
  
  if (file.size > maxSize) {
    throw new Error('Fichier trop volumineux');
  }
  
  // Vérifier l'extension réelle
  const extension = file.name.split('.').pop().toLowerCase();
  const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
  
  if (!validExtensions.includes(extension)) {
    throw new Error('Extension de fichier non autorisée');
  }
  
  return true;
};
```

### 5. Protection CSRF et XSS
```javascript
// utils/security.js
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateCSRF = () => {
  // Implémenter la validation CSRF pour les actions sensibles
  const token = sessionStorage.getItem('csrf-token');
  if (!token) {
    throw new Error('Token CSRF manquant');
  }
  return token;
};
```

### 6. Chiffrement des Données Sensibles
```javascript
// utils/encryption.js
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.VITE_ENCRYPTION_KEY;

export const encryptSensitiveData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

export const decryptSensitiveData = (encryptedData) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};
```

## 🛡️ Mesures de Sécurité Supplémentaires

### 1. Audit et Monitoring
```javascript
// utils/auditLogger.js
export const auditLog = async (action, userId, details) => {
  await addDoc(collection(db, 'auditLogs'), {
    action,
    userId,
    details: sanitizeData(details),
    timestamp: new Date(),
    ip: await getUserIP(),
    userAgent: navigator.userAgent
  });
};
```

### 2. Rate Limiting
```javascript
// utils/rateLimiter.js
const attempts = new Map();

export const checkRateLimit = (userId, action, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const key = `${userId}-${action}`;
  const now = Date.now();
  
  if (!attempts.has(key)) {
    attempts.set(key, []);
  }
  
  const userAttempts = attempts.get(key);
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    throw new Error('Trop de tentatives. Réessayez plus tard.');
  }
  
  recentAttempts.push(now);
  attempts.set(key, recentAttempts);
};
```

### 3. Validation des Permissions en Temps Réel
```javascript
// hooks/usePermissions.js
export const usePermissions = () => {
  const { user } = useAuth();
  
  const checkPermission = useCallback((action, resource) => {
    if (!user) return false;
    
    const permissions = {
      admin: ['read', 'write', 'delete'],
      member: ['read', 'write-own']
    };
    
    return permissions[user.role]?.includes(action);
  }, [user]);
  
  return { checkPermission };
};
```

## 📋 Plan d'Action Prioritaire

### Phase 1 - CRITIQUE (Immédiat)
1. ✅ Implémenter les règles de sécurité Firestore
2. ✅ Ajouter la validation côté serveur
3. ✅ Sécuriser les logs et supprimer les données sensibles

### Phase 2 - ÉLEVÉ (1-2 semaines)
1. ✅ Validation et scan des fichiers uploadés
2. ✅ Chiffrement des données sensibles
3. ✅ Protection CSRF/XSS

### Phase 3 - MOYEN (1 mois)
1. ✅ Système d'audit complet
2. ✅ Rate limiting
3. ✅ Monitoring de sécurité

### Phase 4 - AMÉLIORATION CONTINUE
1. ✅ Tests de pénétration réguliers
2. ✅ Revues de code sécurisé
3. ✅ Formation équipe sécurité

## 🔐 Variables d'Environnement Sécurisées

```env
# .env.production
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_ENCRYPTION_KEY=your-encryption-key
VITE_ENVIRONMENT=production

# Ne jamais exposer côté client
FIREBASE_ADMIN_SDK_KEY=your-admin-key
DATABASE_ENCRYPTION_KEY=your-db-key
```

## 📊 Score de Sécurité Actuel

| Catégorie | Score | Statut |
|-----------|-------|--------|
| Authentification | 7/10 | 🟡 Bon |
| Autorisation | 3/10 | 🔴 Critique |
| Validation | 4/10 | 🟡 Insuffisant |
| Chiffrement | 2/10 | 🔴 Critique |
| Audit | 1/10 | 🔴 Absent |
| **GLOBAL** | **3.4/10** | 🔴 **Critique** |

## 🎯 Objectif Post-Amélioration

| Catégorie | Score Cible | 
|-----------|-------------|
| Authentification | 9/10 |
| Autorisation | 9/10 |
| Validation | 8/10 |
| Chiffrement | 8/10 |
| Audit | 8/10 |
| **GLOBAL** | **8.4/10** |

---

**⚠️ ATTENTION**: Cette application contient des vulnérabilités critiques qui doivent être corrigées avant toute mise en production. La priorité absolue est l'implémentation des règles de sécurité Firestore et de la validation côté serveur.