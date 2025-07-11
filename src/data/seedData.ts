import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

// Données de test pour initialiser la base de données
export const seedDatabase = async () => {
  try {
    console.log('🌱 Initialisation de la base de données...');

    // 1. Créer des services de base
    const services = [
      {
        name: 'Scolaire',
        description: 'Aide pour les frais de scolarité, fournitures scolaires, transport scolaire',
        maxAmount: 2000,
        isActive: true,
        createdDate: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Santé',
        description: 'Remboursement de frais médicaux, médicaments, consultations',
        maxAmount: 1500,
        isActive: true,
        createdDate: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Logement',
        description: 'Aide au loyer, charges, travaux d\'amélioration',
        maxAmount: 3000,
        isActive: true,
        createdDate: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Transport',
        description: 'Aide pour l\'achat de véhicule, réparations, carburant',
        maxAmount: 2500,
        isActive: true,
        createdDate: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Événements familiaux',
        description: 'Aide pour mariages, naissances, décès',
        maxAmount: 1000,
        isActive: true,
        createdDate: new Date().toISOString().split('T')[0]
      }
    ];

    // Ajouter les services
    for (const service of services) {
      await addDoc(collection(db, 'services'), {
        ...service,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('✅ Services créés avec succès');

    // 2. Créer un utilisateur admin de test
    try {
      const adminCredential = await createUserWithEmailAndPassword(
        auth, 
        'admin@musaib.com', 
        'admin123'
      );

      await setDoc(doc(db, 'users', adminCredential.user.uid), {
        email: 'admin@musaib.com',
        name: 'Administrateur MuSAIB',
        role: 'admin',
        phone: '+33 1 23 45 67 89',
        address: '123 Avenue de la République, 75011 Paris',
        firstLogin: false,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Utilisateur admin créé: admin@musaib.com / admin123');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Utilisateur admin existe déjà');
      } else {
        console.error('Erreur création admin:', error);
      }
    }

    // 3. Créer un utilisateur membre de test
    try {
      const memberCredential = await createUserWithEmailAndPassword(
        auth, 
        'membre@musaib.com', 
        'membre123'
      );

      await setDoc(doc(db, 'users', memberCredential.user.uid), {
        email: 'membre@musaib.com',
        name: 'Jean Dupont',
        role: 'member',
        phone: '+33 6 12 34 56 78',
        address: '456 Rue de la Paix, 75001 Paris',
        birthDate: '1985-06-15',
        firstLogin: false,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Utilisateur membre créé: membre@musaib.com / membre123');

      // Ajouter des membres de famille pour le test
      const familyMembers = [
        {
          userId: memberCredential.user.uid,
          firstName: 'Marie',
          lastName: 'Dupont',
          nip: '1234567890123',
          relationship: 'Épouse',
          birthDate: '1987-03-20',
          documents: ['carte_identite.pdf', 'acte_mariage.pdf']
        },
        {
          userId: memberCredential.user.uid,
          firstName: 'Pierre',
          lastName: 'Dupont',
          nip: '1234567890124',
          relationship: 'Fils',
          birthDate: '2010-09-12',
          documents: ['acte_naissance.pdf', 'certificat_scolarite.pdf']
        }
      ];

      for (const member of familyMembers) {
        await addDoc(collection(db, 'familyMembers'), {
          ...member,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      console.log('✅ Membres de famille ajoutés');

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Utilisateur membre existe déjà');
      } else {
        console.error('Erreur création membre:', error);
      }
    }

    console.log('🎉 Base de données initialisée avec succès !');
    
    return {
      success: true,
      message: 'Base de données initialisée avec succès'
    };

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'initialisation',
      error
    };
  }
};

// Fonction pour nettoyer la base de données (développement uniquement)
export const clearDatabase = async () => {
  console.warn('⚠️ Cette fonction est désactivée pour éviter la suppression accidentelle de données');
  // Implémentation de nettoyage si nécessaire en développement
};