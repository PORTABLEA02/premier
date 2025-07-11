interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export async function validateFamilyMember(data: any): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    // 1. Validate required fields
    const requiredFields = ['userId', 'firstName', 'lastName', 'nip', 'relationship', 'birthDate'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Champ requis manquant: ${field}`);
      }
    }

    // 2. Validate NIP format (13 digits)
    if (data.nip) {
      if (!/^\d{13}$/.test(data.nip)) {
        errors.push('NIP doit contenir exactement 13 chiffres');
      }
    }

    // 3. Validate names
    if (data.firstName && (data.firstName.length < 2 || data.firstName.length > 50)) {
      errors.push('Prénom doit contenir entre 2 et 50 caractères');
    }
    if (data.lastName && (data.lastName.length < 2 || data.lastName.length > 50)) {
      errors.push('Nom doit contenir entre 2 et 50 caractères');
    }

    // 4. Validate relationship
    const validRelationships = [
      'Époux/Épouse', 'Fils', 'Fille', 'Père', 'Mère', 
      'Beau-père', 'Belle-mère'
    ];
    if (data.relationship && !validRelationships.includes(data.relationship)) {
      errors.push('Lien de parenté invalide');
    }

    // 5. Validate birth date
    if (data.birthDate) {
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

    // 6. Validate documents array
    if (data.documents && !Array.isArray(data.documents)) {
      errors.push('Documents doit être un tableau');
    }

    // 7. Sanitize text fields
    if (data.firstName) {
      data.firstName = data.firstName.trim();
    }
    if (data.lastName) {
      data.lastName = data.lastName.trim();
    }

  } catch (error) {
    console.error('Erreur lors de la validation du membre famille:', error);
    errors.push('Erreur interne de validation');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}