import React, { useState } from 'react';
import { Database, Play, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { seedDatabase } from '../data/seedData';

export default function DatabaseInitializer() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setResult(null);
    
    try {
      const result = await seedDatabase();
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        message: 'Erreur lors de l\'initialisation'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Ne pas afficher en production
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 max-w-sm">
      <div className="flex items-center space-x-2 mb-3">
        <Database className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">Initialisation DB</h3>
      </div>
      
      <p className="text-xs text-gray-600 mb-3">
        Créer des données de test pour commencer à utiliser l'application.
      </p>

      {result && (
        <div className={`mb-3 p-2 rounded text-xs ${
          result.success 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center space-x-1">
            {result.success ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span>{result.message}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleInitialize}
        disabled={isInitializing}
        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isInitializing ? (
          <>
            <Loader className="h-3 w-3 animate-spin" />
            <span>Initialisation...</span>
          </>
        ) : (
          <>
            <Play className="h-3 w-3" />
            <span>Initialiser</span>
          </>
        )}
      </button>

      {result?.success && (
        <div className="mt-3 text-xs text-gray-600">
          <p className="font-medium mb-1">Comptes créés :</p>
          <p>👨‍💼 Admin: admin@musaib.com / admin123</p>
          <p>👤 Membre: membre@musaib.com / membre123</p>
        </div>
      )}
    </div>
  );
}