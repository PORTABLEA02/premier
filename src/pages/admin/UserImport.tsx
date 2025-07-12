import React, { useState } from 'react';
import { Upload, Download, Users, AlertCircle, CheckCircle, FileSpreadsheet, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';
import { authService } from '../../services/authService';
import { User } from '../../types';

interface ImportUser {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  role: 'admin' | 'member';
  joinDate?: string;
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; email: string; error: string }>;
  total: number;
}

export default function UserImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportUser[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData([]);
      setImportResult(null);
      setShowPreview(false);
      
      // Lire le fichier Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Mapper les données vers notre format
          const mappedData: ImportUser[] = jsonData.map((row: any, index) => ({
            name: row['Nom'] || row['Name'] || row['nom'] || '',
            email: row['Email'] || row['email'] || row['E-mail'] || '',
            phone: row['Téléphone'] || row['Phone'] || row['telephone'] || '',
            address: row['Adresse'] || row['Address'] || row['adresse'] || '',
            birthDate: row['Date de naissance'] || row['Birth Date'] || row['birthDate'] || '',
            role: (row['Rôle'] || row['Role'] || row['role'] || 'member').toLowerCase() === 'admin' ? 'admin' : 'member',
            joinDate: row['Date d\'adhésion'] || row['Join Date'] || row['joinDate'] || new Date().toISOString().split('T')[0]
          }));
          
          setPreviewData(mappedData);
        } catch (error) {
          console.error('Erreur lors de la lecture du fichier:', error);
          alert('Erreur lors de la lecture du fichier Excel. Vérifiez le format.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const validateData = (data: ImportUser[]): string[] => {
    const errors: string[] = [];
    
    data.forEach((user, index) => {
      if (!user.name.trim()) {
        errors.push(`Ligne ${index + 2}: Le nom est requis`);
      }
      if (!user.email.trim()) {
        errors.push(`Ligne ${index + 2}: L'email est requis`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        errors.push(`Ligne ${index + 2}: Format d'email invalide (${user.email})`);
      }
    });
    
    return errors;
  };

  const handlePreview = () => {
    if (previewData.length === 0) {
      alert('Veuillez d\'abord sélectionner un fichier Excel valide.');
      return;
    }
    
    const validationErrors = validateData(previewData);
    if (validationErrors.length > 0) {
      alert('Erreurs de validation:\n' + validationErrors.join('\n'));
      return;
    }
    
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    
    setIsImporting(true);
    const result: ImportResult = {
      success: 0,
      errors: [],
      total: previewData.length
    };
    
    for (let i = 0; i < previewData.length; i++) {
      const user = previewData[i];
      try {
        await authService.createUser({
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          birthDate: user.birthDate,
          joinDate: user.joinDate || new Date().toISOString().split('T')[0],
          status: 'active'
        }, 'Default123');
        
        result.success++;
      } catch (error: any) {
        result.errors.push({
          row: i + 2,
          email: user.email,
          error: error.message || 'Erreur inconnue'
        });
      }
    }
    
    setImportResult(result);
    setIsImporting(false);
    setShowPreview(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Nom': 'Jean Dupont',
        'Email': 'jean.dupont@example.com',
        'Téléphone': '+33 6 12 34 56 78',
        'Adresse': '123 Rue de la République, 75001 Paris',
        'Date de naissance': '1985-06-15',
        'Rôle': 'member',
        'Date d\'adhésion': '2024-01-15'
      },
      {
        'Nom': 'Marie Martin',
        'Email': 'marie.martin@example.com',
        'Téléphone': '+33 6 98 76 54 32',
        'Adresse': '456 Avenue des Champs, 75008 Paris',
        'Date de naissance': '1990-03-20',
        'Rôle': 'member',
        'Date d\'adhésion': '2024-01-20'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
    XLSX.writeFile(wb, 'template_utilisateurs_musaib.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Importation d'utilisateurs</h1>
        <p className="text-gray-600 mt-2">Importez des utilisateurs en masse depuis un fichier Excel</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start">
          <AlertCircle className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">Instructions d'importation</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Le fichier Excel doit contenir les colonnes : Nom, Email (obligatoires)</li>
              <li>• Colonnes optionnelles : Téléphone, Adresse, Date de naissance, Rôle, Date d'adhésion</li>
              <li>• Le mot de passe par défaut "Default123" sera assigné à tous les utilisateurs</li>
              <li>• Les utilisateurs devront changer leur mot de passe lors de leur première connexion</li>
              <li>• Téléchargez le modèle Excel pour voir le format attendu</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template Download */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-center">
            <FileSpreadsheet className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Modèle Excel</h3>
            <p className="text-sm text-gray-600 mb-4">
              Téléchargez le modèle Excel avec le format requis
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Download className="h-5 w-5 mr-2" />
              Télécharger le modèle
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-center">
            <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Importer le fichier</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez votre fichier Excel contenant les utilisateurs
            </p>
            <label className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer">
              <Upload className="h-5 w-5 mr-2" />
              Choisir un fichier
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-2">
                Fichier sélectionné : {selectedFile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* File Info and Actions */}
      {selectedFile && previewData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Fichier analysé</h3>
              <p className="text-sm text-gray-600">
                {previewData.length} utilisateur(s) détecté(s) dans le fichier
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Prévisualiser
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isImporting ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Importer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Prévisualisation - {previewData.length} utilisateur(s)
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Téléphone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d'adhésion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((user, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Administrateur' : 'Membre'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.joinDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Fermer
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isImporting ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Confirmer l'importation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Résultats de l'importation</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
              <p className="text-sm text-green-800">Utilisateurs créés</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
              <p className="text-sm text-red-800">Erreurs</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{importResult.total}</p>
              <p className="text-sm text-blue-800">Total traité</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Erreurs détaillées :</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <span className="font-medium">Ligne {error.row}</span> ({error.email}): {error.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Information importante</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Tous les utilisateurs créés ont le mot de passe par défaut "Default123". 
                  Ils devront le changer lors de leur première connexion.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}