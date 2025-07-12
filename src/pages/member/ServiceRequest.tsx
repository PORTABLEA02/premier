import React, { useState, useEffect } from "react";
import { FileText, Upload, Send, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { FamilyMember, Service } from '../../types';

interface ServiceRequestForm {
  serviceId: string;
  beneficiary: string;
  amount: number;
  description: string;
  paymentMethod: 'mobile' | 'bank';
  mobileNumber?: string;
  bankAccount?: string;
  accountHolderName?: string;
}

export default function ServiceRequest() {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ServiceRequestForm>();
  
  const selectedServiceId = watch('serviceId');
  const selectedService = services.find(s => s.id === selectedServiceId);
  const currentAmount = watch('amount');
  const paymentMethod = watch('paymentMethod');
  const selectedBeneficiary = watch('beneficiary');

  // Charger les données nécessaires
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [members, servicesData] = await Promise.all([
          userService.getFamilyMembers(user.id),
          userService.getAllServices() // Récupération des services depuis la base de données
        ]);
        setFamilyMembers(members);
        setServices(servicesData); // Stockage dans le state
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Mettre à jour le montant automatiquement quand un service est sélectionné
  useEffect(() => {
    if (selectedService) {
      // Si ce n'est pas "Demande de prêt", définir le montant au maximum du service
      if (selectedService.name !== "Demande de prêt") {
        setValue('amount', selectedService.maxAmount);
      } else {
        // Pour "Demande de prêt", laisser le champ vide pour que l'utilisateur puisse saisir
        setValue('amount', 0);
      }
    }
  }, [selectedService, setValue]);

  // Préremplir les champs selon le mode de paiement sélectionné
  useEffect(() => {
    if (paymentMethod && user) {
      if (paymentMethod === 'mobile') {
        setValue('mobileNumber', user.phone || '');
        setValue('accountHolderName', user.name || '');
      } else if (paymentMethod === 'bank') {
        setValue('accountHolderName', user.name || '');
      }
    }
  }, [paymentMethod, user, setValue]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ServiceRequestForm) => {
    if (!user || !selectedService) return;

    // Vérifier que des fichiers sont sélectionnés
    if (selectedFiles.length === 0) {
      setSubmitResult({
        success: false,
        message: 'Veuillez joindre au moins une pièce justificative à votre demande.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // Vérifier que le montant ne dépasse pas le maximum autorisé
      if (data.amount > selectedService.maxAmount) {
        setSubmitResult({
          success: false,
          message: `Le montant demandé ne peut pas dépasser ${selectedService.maxAmount.toLocaleString()} FCFA pour ce service.`
        });
        return;
      }

      // Déterminer le nom du bénéficiaire
      let beneficiaryName = user.name;
      if (data.beneficiary !== 'self') {
        const member = familyMembers.find(m => m.id === data.beneficiary);
        if (member) {
          beneficiaryName = `${member.firstName} ${member.lastName}`;
        }
      }

      // Créer l'objet de base de la demande
      const baseRequestData = {
        userId: user.id,
        memberName: user.name,
        memberEmail: user.email,
        service: selectedService.name,
        serviceId: selectedService.id,
        beneficiary: beneficiaryName,
        amount: Number(data.amount), // Convertir explicitement en nombre
        description: data.description,
        paymentMethod: data.paymentMethod,
        accountHolderName: data.accountHolderName,
        status: 'pending' as const,
        submissionDate: new Date().toISOString(),
        documents: selectedFiles.map(file => file.name),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Ajouter les champs spécifiques selon le mode de paiement
      let requestData;
      if (data.paymentMethod === 'mobile') {
        // Pour Mobile Monnaie : inclure seulement mobileNumber
        requestData = {
          ...baseRequestData,
          mobileNumber: data.mobileNumber
          // bankAccount est exclu
        };
      } else if (data.paymentMethod === 'bank') {
        // Pour Virement bancaire : inclure seulement bankAccount
        requestData = {
          ...baseRequestData,
          bankAccount: data.bankAccount
          // mobileNumber est exclu
        };
      } else {
        // Fallback (ne devrait pas arriver)
        requestData = baseRequestData;
      }

      // Enregistrer la demande dans la base de données
      const requestId = await userService.addServiceRequest(requestData);

      setSubmitResult({
        success: true,
        message: `Votre demande a été soumise avec succès et est maintenant "En attente de traitement". Numéro de référence: ${requestId.substring(0, 8).toUpperCase()}. Vous recevrez une notification dès qu'elle sera traitée par l'administrateur.`
      });

      // Réinitialiser le formulaire
      setValue('serviceId', '');
      setValue('beneficiary', '');
      setValue('amount', 0);
      setValue('description', '');
      setValue('paymentMethod', 'mobile');
      setValue('mobileNumber', '');
      setValue('bankAccount', '');
      setValue('accountHolderName', '');
      setSelectedFiles([]);

      // Faire défiler vers le haut pour voir le message de succès
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setSubmitResult({
        success: false,
        message: 'Une erreur est survenue lors de la soumission de votre demande. Veuillez réessayer.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vérifier si le montant peut être modifié
  const isAmountEditable = selectedService?.name === "Demande de prêt";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Demande de service</h1>
        <p className="text-gray-600 mt-2">Soumettez votre demande de prestation sociale</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
          <div className="p-8">
            {/* Result Message */}
            {submitResult && (
              <div className={`mb-6 p-6 rounded-xl border-2 ${
                submitResult.success 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-start">
                  {submitResult.success ? (
                    <CheckCircle className="h-6 w-6 mr-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 mr-3 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">
                      {submitResult.success ? 'Demande soumise avec succès !' : 'Erreur lors de la soumission'}
                    </h4>
                    <p className="text-sm leading-relaxed">{submitResult.message}</p>
                    {submitResult.success && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg">
                        <p className="text-sm font-medium text-green-900">Prochaines étapes :</p>
                        <ul className="text-sm text-green-800 mt-1 space-y-1">
                          <li>• Votre demande est maintenant <strong>"En attente de traitement"</strong></li>
                          <li>• Un administrateur examinera votre dossier sous 48h</li>
                          <li>• Vous recevrez une notification par email du résultat</li>
                          <li>• Vous pouvez suivre l'état dans votre historique</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Service Selection */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Type de service *
                  <span className="text-red-500 ml-1">Obligatoire</span>
                </h2>
                
                {/* Liste des services depuis la base de données - Version compacte */}
                <div className="space-y-2">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun service disponible pour le moment</p>
                    </div>
                  ) : (
                    services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => setValue('serviceId', service.id)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                          selectedServiceId === service.id
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" 
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                                <span className="text-sm font-bold text-blue-600 ml-4">
                                  Max: {service.maxAmount.toLocaleString()} FCFA
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  service.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {service.isActive ? 'Actif' : 'Inactif'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedServiceId === service.id
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedServiceId === service.id && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {errors.serviceId && (
                  <p className="mt-2 text-sm text-red-600 font-medium">Veuillez sélectionner un service</p>
                )}
                <input
                  {...register('serviceId', { required: 'Veuillez sélectionner un service' })}
                  type="hidden"
                />
              </div>

              {/* Service Details */}
              {selectedService && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Service sélectionné : {selectedService.name}</h3>
                  <p className="text-blue-800 mb-3">{selectedService.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Montant maximum autorisé :</span>
                    <span className="text-lg font-bold text-blue-900">
                      {selectedService.maxAmount.toLocaleString()} FCFA
                    </span>
                  </div>
                  {!isAmountEditable && (
                    <div className="mt-2 p-2 bg-blue-100 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Note :</strong> Le montant est automatiquement défini au maximum autorisé pour ce service.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Beneficiary Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Bénéficiaire de la prestation *
                  <span className="text-red-500 ml-1">Obligatoire</span>
                </label>
                <select 
                  {...register('beneficiary', { required: 'Veuillez sélectionner un bénéficiaire' })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.beneficiary ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <option value="">
                    {loading ? 'Chargement...' : ''}
                  </option>
                  <option value="self">
                    {user?.name} (Moi-même)
                  </option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.relationship})
                    </option>
                  ))}
                </select>
                {errors.beneficiary && (
                  <p className="mt-1 text-sm text-red-600 font-medium">{errors.beneficiary.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Montant demandé (FCFA)
                  {!isAmountEditable && selectedService && (
                    <span className="text-sm text-gray-500 ml-2">(Montant automatique)</span>
                  )}
                </label>
                <input 
                  {...register('amount', { 
                    required: 'Le montant est requis',
                    min: { value: 1, message: 'Le montant doit être supérieur à 0' },
                    max: selectedService ? { 
                      value: selectedService.maxAmount, 
                      message: `Le montant ne peut pas dépasser ${selectedService.maxAmount.toLocaleString()} FCFA` 
                    } : undefined
                  })}
                  type="number"
                  min="1"
                  max={selectedService?.maxAmount}
                  readOnly={!isAmountEditable}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isAmountEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="0"
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
                {selectedService && (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Maximum autorisé : {selectedService.maxAmount.toLocaleString()} FCFA
                    </p>
                    {isAmountEditable && (
                      <p className="text-sm text-green-600">
                        ✓ Montant modifiable
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Mode de paiement *
                  <span className="text-red-500 ml-1">Obligatoire</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setValue('paymentMethod', 'mobile')}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      paymentMethod === 'mobile'
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" 
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Mobile Monnaie</h3>
                          <p className="text-sm text-gray-600">Orange Money, MTN Money, etc.</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === 'mobile'
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'mobile' && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setValue('paymentMethod', 'bank')}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      paymentMethod === 'bank'
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" 
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Virement bancaire</h3>
                          <p className="text-sm text-gray-600">Transfert vers compte bancaire</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === 'bank'
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'bank' && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {errors.paymentMethod && (
                  <p className="mt-2 text-sm text-red-600 font-medium">Veuillez sélectionner un mode de paiement</p>
                )}
                <input
                  {...register('paymentMethod', { required: 'Veuillez sélectionner un mode de paiement' })}
                  type="hidden"
                />
              </div>

              {/* Payment Method Specific Fields */}
              {paymentMethod === 'mobile' && (
                <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-lg font-medium text-green-900 mb-3">Informations Mobile Monnaie</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de dépôt *
                    </label>
                    <input
                      {...register('mobileNumber', { 
                        required: paymentMethod === 'mobile' ? 'Le numéro de dépôt est requis' : false 
                      })}
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: +225 07 12 34 56 78"
                    />
                    {errors.mobileNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.mobileNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom et prénoms de l'abonné *
                    </label>
                    <input
                      {...register('accountHolderName', { 
                        required: paymentMethod === 'mobile' ? 'Le nom de l\'abonné est requis' : false 
                      })}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom complet de l'abonné"
                    />
                    {errors.accountHolderName && (
                      <p className="mt-1 text-sm text-red-600">{errors.accountHolderName.message}</p>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-900 mb-3">Informations bancaires</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro bancaire *
                      <div className="group relative inline-block ml-2">
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10">
                          Rapprochez-vous de l'AG pour confirmer le numéro de compte bancaire.
                        </div>
                      </div>
                    </label>
                    <input
                      {...register('bankAccount', { 
                        required: paymentMethod === 'bank' ? 'Le numéro bancaire est requis' : false 
                      })}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: CI05 CI000 12345678901234567890 12"
                    />
                    {errors.bankAccount && (
                      <p className="mt-1 text-sm text-red-600">{errors.bankAccount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom et prénoms de l'abonné *
                    </label>
                    <input
                      {...register('accountHolderName', { 
                        required: paymentMethod === 'bank' ? 'Le nom du titulaire est requis' : false 
                      })}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom complet du titulaire du compte"
                    />
                    {errors.accountHolderName && (
                      <p className="mt-1 text-sm text-red-600">{errors.accountHolderName.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Description détaillée de la demande
                </label>
                <textarea
                  {...register('description', { 
                    required: 'La description est requise',
                    minLength: { value: 20, message: 'La description doit contenir au moins 20 caractères' }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={5}
                  placeholder="Décrivez votre demande en détail : motif, circonstances, justification du montant demandé..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pièces justificatives *
                  <span className="text-red-500 ml-1">Obligatoire</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-800 font-medium">
                      Cliquez pour uploader
                    </span>
                    <span className="text-gray-600"> ou glissez-déposez vos fichiers</span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF, PNG, JPG (MAX. 10MB chacun)
                  </p>
                  <p className="text-sm text-red-600 mt-1 font-medium">
                    Au moins un document est requis
                  </p>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Fichiers sélectionnés :</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-900">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error message for missing files */}
                {selectedFiles.length === 0 && submitResult && !submitResult.success && submitResult.message.includes('pièce justificative') && (
                  <p className="mt-2 text-sm text-red-600">
                    Veuillez joindre au moins une pièce justificative
                  </p>
                )}
              </div>

              {/* Important Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start">
                  <AlertCircle className="h-6 w-6 text-amber-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-900 mb-2">Important</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• <strong>Tous les champs marqués d'un * sont obligatoires</strong></li>
                      <li>• <strong>Les pièces justificatives sont obligatoires</strong> pour toute demande</li>
                      <li>• Assurez-vous que tous les documents requis sont joints à votre demande</li>
                      <li>• Les demandes incomplètes peuvent être retardées ou rejetées</li>
                      <li>• Votre demande aura le statut <strong>"En attente de traitement"</strong> après soumission</li>
                      <li>• Le délai de traitement est généralement de 48h ouvrables</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedService || !selectedBeneficiary || !paymentMethod || selectedFiles.length === 0}
                  className="flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg font-medium shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Soumission en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-3" />
                      Soumettre la demande
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}