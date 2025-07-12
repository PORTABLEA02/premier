import * as admin from 'firebase-admin';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export async function validateServiceRequest(data: any, requestId: string): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    // 1. Validate required fields
    const requiredFields = [
      'userId', 'memberName', 'memberEmail', 'service', 'serviceId',
      'beneficiary', 'amount', 'description', 'status', 'submissionDate',
      'documents', 'paymentMethod', 'accountHolderName'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Champ requis manquant: ${field}`);
      }
    }

    // 2. Validate user exists and is active
    if (data.userId) {
      const userDoc = await admin.firestore().collection('users').doc(data.userId).get();
      if (!userDoc.exists) {
        errors.push('Utilisateur inexistant');
      } else {
        const userData = userDoc.data();
        if (userData?.status !== 'active') {
          errors.push('Compte utilisateur inactif');
        }
        if (userData?.email !== data.memberEmail) {
          errors.push('Email utilisateur ne correspond pas');
        }
      }
    }

    // 3. Validate service exists and is active
    if (data.serviceId) {
      const serviceDoc = await admin.firestore().collection('services').doc(data.serviceId).get();
      if (!serviceDoc.exists) {
        errors.push('Service inexistant');
      } else {
        const serviceData = serviceDoc.data();
        if (!serviceData?.isActive) {
          errors.push('Service inactif');
        }
        if (serviceData?.name !== data.service) {
          errors.push('Nom du service ne correspond pas');
        }
        
        // Validate amount against service limits
        if (data.amount > serviceData?.maxAmount) {
          errors.push(`Montant dépasse la limite autorisée (${serviceData.maxAmount} FCFA)`);
        }
      }
    }

    // 4. Validate amount
    if (data.amount) {
      if (typeof data.amount !== 'number' || data.amount <= 0) {
        errors.push('Montant invalide');
      }
      if (data.amount > 10000000) { // 10 million FCFA max
        errors.push('Montant trop élevé');
      }
    }

    // 5. Validate email format
    if (data.memberEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.memberEmail)) {
        errors.push('Format email invalide');
      }
    }

    // 6. Validate status
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push('Statut invalide');
    }

    // 7. Validate payment method
    const validPaymentMethods = ['mobile', 'bank'];
    if (data.paymentMethod && !validPaymentMethods.includes(data.paymentMethod)) {
      errors.push('Mode de paiement invalide');
    }

    // 8. Validate payment method specific fields
    if (data.paymentMethod === 'mobile' && !data.mobileNumber) {
      errors.push('Numéro mobile requis pour le paiement mobile');
    }
    if (data.paymentMethod === 'bank' && !data.bankAccount) {
      errors.push('Numéro de compte bancaire requis pour le virement');
    }

    // 9. Validate documents
    if (!data.documents || !Array.isArray(data.documents) || data.documents.length === 0) {
      errors.push('Au moins un document justificatif est requis');
    }

    // 10. Validate description length
    if (data.description && data.description.length < 20) {
      errors.push('Description trop courte (minimum 20 caractères)');
    }

    // 11. Check for duplicate requests (same user, service, amount in last 24h)
    if (data.userId && data.serviceId && data.amount) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const duplicateCheck = await admin.firestore()
        .collection('serviceRequests')
        .where('userId', '==', data.userId)
        .where('serviceId', '==', data.serviceId)
        .where('amount', '==', data.amount)
        .where('submissionDate', '>=', oneDayAgo.toISOString())
        .get();

      if (!duplicateCheck.empty) {
        // Exclude current request from duplicate check
        const duplicates = duplicateCheck.docs.filter(doc => doc.id !== requestId);
        if (duplicates.length > 0) {
          errors.push('Demande similaire déjà soumise dans les dernières 24h');
        }
      }
    }

    // 12. Validate beneficiary
    if (data.beneficiary && data.userId) {
      // If beneficiary is not the user themselves, check if it's a valid family member
      const userDoc = await admin.firestore().collection('users').doc(data.userId).get();
      const userData = userDoc.data();
      
      if (data.beneficiary !== userData?.name) {
        // Check if beneficiary is a family member
        const familyMembers = await admin.firestore()
          .collection('familyMembers')
          .where('userId', '==', data.userId)
          .get();

        const validBeneficiary = familyMembers.docs.some(doc => {
          const member = doc.data();
          return `${member.firstName} ${member.lastName}` === data.beneficiary;
        });

        if (!validBeneficiary) {
          errors.push('Bénéficiaire non autorisé');
        }
      }
    }

    // 13. Validate submission date
    if (data.submissionDate) {
      const submissionDate = new Date(data.submissionDate);
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      if (submissionDate > oneHourFromNow) {
        errors.push('Date de soumission invalide (future)');
      }
    }

  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    errors.push('Erreur interne de validation');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}