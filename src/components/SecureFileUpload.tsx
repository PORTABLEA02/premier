import React, { useState, useCallback } from 'react';
import { Upload, X, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { validateFile } from '../utils/securityHelpers';
import { useSecurityMonitoring } from '../hooks/useSecurityMonitoring';

interface SecureFileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
}

export default function SecureFileUpload({ 
  onFilesChange, 
  maxFiles = 5, 
  accept = '.pdf,.png,.jpg,.jpeg',
  className = ''
}: SecureFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { logSecurityEvent } = useSecurityMonitoring();

  const handleFileValidation = useCallback((files: FileList) => {
    const newFiles: File[] = [];
    const newErrors: string[] = [];

    Array.from(files).forEach((file, index) => {
      const validation = validateFile(file);
      
      if (validation.isValid) {
        newFiles.push(file);
        
        // Log de l'upload sécurisé
        logSecurityEvent({
          type: 'file_upload',
          details: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            status: 'validated'
          },
          severity: 'low'
        });
      } else {
        newErrors.push(`${file.name}: ${validation.error}`);
        
        // Log de la tentative d'upload non sécurisé
        logSecurityEvent({
          type: 'suspicious_activity',
          details: {
            description: 'Tentative d\'upload de fichier non autorisé',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            error: validation.error
          },
          severity: 'medium'
        });
      }
    });

    return { validFiles: newFiles, errors: newErrors };
  }, [logSecurityEvent]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const { validFiles, errors } = handleFileValidation(files);
    
    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > maxFiles) {
      setErrors([...errors, `Maximum ${maxFiles} fichiers autorisés`]);
      return;
    }

    const updatedFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(updatedFiles);
    setErrors(errors);
    onFilesChange(updatedFiles);

    // Reset input
    event.target.value = '';
  }, [selectedFiles, maxFiles, onFilesChange, handleFileValidation]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (!files) return;

    const { validFiles, errors } = handleFileValidation(files);
    
    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > maxFiles) {
      setErrors([...errors, `Maximum ${maxFiles} fichiers autorisés`]);
      return;
    }

    const updatedFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(updatedFiles);
    setErrors(errors);
    onFilesChange(updatedFiles);
  }, [selectedFiles, maxFiles, onFilesChange, handleFileValidation]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesChange(updatedFiles);
    
    // Effacer les erreurs si on supprime des fichiers
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [selectedFiles, onFilesChange, errors]);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Zone de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <Upload className={`h-12 w-12 mx-auto mb-4 ${
          isDragOver ? 'text-blue-600' : 'text-gray-400'
        }`} />
        
        <label className="cursor-pointer">
          <span className="text-blue-600 hover:text-blue-800 font-medium">
            Cliquez pour uploader
          </span>
          <span className="text-gray-600"> ou glissez-déposez vos fichiers</span>
          <input
            type="file"
            className="hidden"
            multiple
            accept={accept}
            onChange={handleFileChange}
          />
        </label>
        
        <p className="text-sm text-gray-500 mt-2">
          PDF, PNG, JPG (MAX. 10MB chacun)
        </p>
        
        <p className="text-xs text-gray-400 mt-1">
          Maximum {maxFiles} fichiers • Fichiers sélectionnés: {selectedFiles.length}
        </p>
      </div>

      {/* Erreurs */}
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Liste des fichiers sélectionnés */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Fichiers sélectionnés ({selectedFiles.length}/{maxFiles})
            </h4>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center flex-1">
                <span className="text-lg mr-3">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-3 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors duration-200"
                title="Supprimer le fichier"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Informations de sécurité */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <FileText className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Sécurité des fichiers</h4>
            <ul className="text-xs text-blue-800 mt-1 space-y-1">
              <li>• Seuls les fichiers PDF, JPG et PNG sont autorisés</li>
              <li>• Taille maximum: 10MB par fichier</li>
              <li>• Les fichiers sont automatiquement vérifiés</li>
              <li>• Aucun script ou contenu malveillant n'est accepté</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}