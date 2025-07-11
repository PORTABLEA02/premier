import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

// Client-side validation service that works with server-side functions
export const validationService = {
  // Check rate limit before submitting request
  async checkRequestRateLimit(): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const checkRateLimit = httpsCallable(functions, 'checkRequestRateLimit');
      const result = await checkRateLimit();
      return result.data as { allowed: boolean; remaining: number };
    } catch (error: any) {
      console.error('Erreur lors de la vérification du rate limit:', error);
      
      if (error.code === 'resource-exhausted') {
        throw new Error(error.message);
      }
      
      throw new Error('Erreur lors de la vérification des limites');
    }
  },

  // Enhanced client-side validation before server submission
  validateServiceRequestData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation that mirrors server-side validation
    if (!data.serviceId) errors.push('Service requis');
    if (!data.beneficiary) errors.push('Bénéficiaire requis');
    if (!data.amount || data.amount <= 0) errors.push('Montant invalide');
    if (!data.paymentMethod) errors.push('Mode de paiement requis');
    if (!data.accountHolderName) errors.push('Nom du titulaire requis');

    // Payment method specific validation
    if (data.paymentMethod === 'mobile' && !data.mobileNumber) {
      errors.push('Numéro mobile requis');
    }
    if (data.paymentMethod === 'bank' && !data.bankAccount) {
      errors.push('Numéro de compte bancaire requis');
    }

    // Amount validation
    if (data.amount > 10000000) {
      errors.push('Montant trop élevé (maximum 10 000 000 FCFA)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateUserData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.length < 2) {
      errors.push('Nom requis (minimum 2 caractères)');
    }
    if (!data.email) {
      errors.push('Email requis');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Format email invalide');
      }
    }
    if (!data.role || !['admin', 'member'].includes(data.role)) {
      errors.push('Rôle invalide');
    }

    if (data.phone) {
      const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{8,14}$/;
      if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
        errors.push('Format de téléphone invalide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateFamilyMemberData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.firstName || data.firstName.length < 2) {
      errors.push('Prénom requis (minimum 2 caractères)');
    }
    if (!data.lastName || data.lastName.length < 2) {
      errors.push('Nom requis (minimum 2 caractères)');
    }
    if (!data.nip || !/^\d{13}$/.test(data.nip)) {
      errors.push('NIP doit contenir exactement 13 chiffres');
    }
    if (!data.relationship) {
      errors.push('Lien de parenté requis');
    }
    if (!data.birthDate) {
      errors.push('Date de naissance requise');
    } else {
      const birthDate = new Date(data.birthDate);
      const now = new Date();
      
      // Vérifier que la date n'est pas dans le futur
      if (birthDate > now) {
        errors.push('La date de naissance ne peut pas être dans le futur');
      }
      
      // Calculer l'âge correctement
      const age = now.getFullYear() - birthDate.getFullYear();
      const monthDiff = now.getMonth() - birthDate.getMonth();
      
      let calculatedAge = age;
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      if (calculatedAge > 120) {
        errors.push('Âge invalide (maximum 120 ans)');
      }
      
      if (calculatedAge < 0) {
        errors.push('Date de naissance invalide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};