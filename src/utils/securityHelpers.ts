import CryptoJS from 'crypto-js';

// Configuration de sécurité
const SECURITY_CONFIG = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png']
};

// Stockage des tentatives de connexion
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Validation et nettoyage des entrées
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;');
};

// Validation des fichiers
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Vérifier le type MIME
  if (!SECURITY_CONFIG.allowedFileTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Type de fichier non autorisé. Seuls les PDF, JPG et PNG sont acceptés.'
    };
  }

  // Vérifier la taille
  if (file.size > SECURITY_CONFIG.maxFileSize) {
    return {
      isValid: false,
      error: `Fichier trop volumineux. Taille maximum: ${SECURITY_CONFIG.maxFileSize / 1024 / 1024}MB`
    };
  }

  // Vérifier l'extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SECURITY_CONFIG.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'Extension de fichier non autorisée.'
    };
  }

  // Vérifier le nom du fichier
  if (file.name.length > 255) {
    return {
      isValid: false,
      error: 'Nom de fichier trop long.'
    };
  }

  // Vérifier les caractères dangereux dans le nom
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    return {
      isValid: false,
      error: 'Nom de fichier contient des caractères non autorisés.'
    };
  }

  return { isValid: true };
};

// Gestion du rate limiting pour les connexions
export const checkLoginRateLimit = (email: string): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const attempts = loginAttempts.get(email);

  if (!attempts) {
    loginAttempts.set(email, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  // Réinitialiser si la période de verrouillage est expirée
  if (now - attempts.lastAttempt > SECURITY_CONFIG.lockoutDuration) {
    loginAttempts.set(email, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  // Vérifier si le nombre maximum de tentatives est atteint
  if (attempts.count >= SECURITY_CONFIG.maxLoginAttempts) {
    const remainingTime = Math.ceil((SECURITY_CONFIG.lockoutDuration - (now - attempts.lastAttempt)) / 60000);
    return {
      allowed: false,
      error: `Trop de tentatives de connexion. Réessayez dans ${remainingTime} minute(s).`
    };
  }

  // Incrémenter le compteur
  loginAttempts.set(email, { count: attempts.count + 1, lastAttempt: now });
  return { allowed: true };
};

// Réinitialiser les tentatives après une connexion réussie
export const resetLoginAttempts = (email: string): void => {
  loginAttempts.delete(email);
};

// Validation des mots de passe
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  // Vérifier les mots de passe communs
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Ce mot de passe est trop commun');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation des emails
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

// Validation des numéros de téléphone
export const validatePhone = (phone: string): boolean => {
  // Format international ou local
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{8,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Validation du NIP (13 chiffres)
export const validateNIP = (nip: string): boolean => {
  return /^\d{13}$/.test(nip);
};

// Validation des dates de naissance
export const validateBirthDate = (birthDate: string): { isValid: boolean; error?: string } => {
  const selectedDate = new Date(birthDate);
  const today = new Date();
  
  // Vérifier que la date n'est pas dans le futur
  if (selectedDate > today) {
    return {
      isValid: false,
      error: 'La date de naissance ne peut pas être dans le futur'
    };
  }
  
  // Vérifier que l'âge est raisonnable (maximum 120 ans)
  const age = today.getFullYear() - selectedDate.getFullYear();
  const monthDiff = today.getMonth() - selectedDate.getMonth();
  
  let calculatedAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
    calculatedAge--;
  }
  
  if (calculatedAge > 120) {
    return {
      isValid: false,
      error: 'Âge invalide (maximum 120 ans)'
    };
  }
  
  if (calculatedAge < 0) {
    return {
      isValid: false,
      error: 'Date de naissance invalide'
    };
  }
  
  return { isValid: true };
};

// Chiffrement des données sensibles (pour le stockage local temporaire)
export const encryptData = (data: string, key: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, key).toString();
  } catch (error) {
    console.error('Erreur de chiffrement:', error);
    throw new Error('Erreur lors du chiffrement des données');
  }
};

// Déchiffrement des données
export const decryptData = (encryptedData: string, key: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erreur de déchiffrement:', error);
    throw new Error('Erreur lors du déchiffrement des données');
  }
};

// Génération de tokens sécurisés
export const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Validation des montants
export const validateAmount = (amount: string | number, maxAmount?: number): { isValid: boolean; error?: string } => {
  const numAmount = Number(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: 'Le montant doit être un nombre positif' };
  }

  if (maxAmount && numAmount > maxAmount) {
    return { 
      isValid: false, 
      error: `Le montant ne peut pas dépasser ${maxAmount.toLocaleString()} FCFA`
    };
  }

  // Vérifier que le montant n'est pas trop élevé (protection contre les erreurs)
  if (numAmount > 100000000) { // 100 millions
    return { isValid: false, error: 'Montant trop élevé' };
  }

  return { isValid: true };
};

// Nettoyage des données pour les logs
export const sanitizeForLogging = (data: any): any => {
  const sensitiveFields = [
    'password', 'email', 'phone', 'nip', 'bankAccount', 
    'mobileNumber', 'address', 'birthDate'
  ];

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***MASKED***';
    }
  });

  return sanitized;
};

// Vérification de l'intégrité des données
export const verifyDataIntegrity = (data: any, expectedFields: string[]): boolean => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return expectedFields.every(field => data.hasOwnProperty(field));
};

// Protection contre les attaques de timing
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};

// Génération d'un hash sécurisé pour les identifiants
export const generateSecureHash = (input: string): string => {
  return CryptoJS.SHA256(input + Date.now() + Math.random()).toString();
};

export { SECURITY_CONFIG };