interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export async function validateUserData(data: any): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    // 1. Validate required fields
    const requiredFields = ['email', 'name', 'role', 'status'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Champ requis manquant: ${field}`);
      }
    }

    // 2. Validate email format
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Format email invalide');
      }
    }

    // 3. Validate role
    const validRoles = ['admin', 'member'];
    if (data.role && !validRoles.includes(data.role)) {
      errors.push('Rôle invalide');
    }

    // 4. Validate status
    const validStatuses = ['active', 'suspended'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push('Statut invalide');
    }

    // 5. Validate name length
    if (data.name && (data.name.length < 2 || data.name.length > 100)) {
      errors.push('Nom doit contenir entre 2 et 100 caractères');
    }

    // 6. Validate phone format if provided
    if (data.phone) {
      const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{8,14}$/;
      if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
        errors.push('Format de téléphone invalide');
      }
    }

    // 7. Validate birth date if provided
    if (data.birthDate) {
      const birthDate = new Date(data.birthDate);
      const now = new Date();
      const age = now.getFullYear() - birthDate.getFullYear();
      
      if (age < 0 || age > 120) {
        errors.push('Date de naissance invalide');
      }
    }

    // 8. Validate join date if provided
    if (data.joinDate) {
      const joinDate = new Date(data.joinDate);
      const now = new Date();
      
      if (joinDate > now) {
        errors.push('Date d\'adhésion ne peut pas être dans le futur');
      }
    }

    // 9. Sanitize text fields
    if (data.name) {
      data.name = data.name.trim();
    }
    if (data.address) {
      data.address = data.address.trim();
    }

  } catch (error) {
    console.error('Erreur lors de la validation utilisateur:', error);
    errors.push('Erreur interne de validation');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}