export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  phone?: string;
  address?: string;
  birthDate?: string;
  firstLogin?: boolean;
  status: 'active' | 'suspended';
  joinDate?: string;
  lastLogin?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  nip: string;
  relationship: string;
  birthDate: string;
  documents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  maxAmount: number;
  isActive: boolean;
  createdDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRequest {
  id: string;
  userId: string;
  memberName: string;
  memberEmail: string;
  service: string;
  serviceId: string;
  beneficiary: string;
  amount: number;
  description?: string; // Optionnel maintenant
  status: 'pending' | 'approved' | 'rejected';
  submissionDate: string;
  responseDate?: string;
  documents: string[];
  comments?: string;
  reviewedBy?: string;
  paymentMethod: 'mobile' | 'bank';
  accountHolderName: string;
  // Champs conditionnels selon le mode de paiement
  mobileNumber?: string; // Seulement pour Mobile Monnaie
  bankAccount?: string;  // Seulement pour Virement bancaire
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  read: boolean;
  relatedId?: string;
  relatedType?: 'request' | 'user' | 'service';
  createdAt: Date;
}