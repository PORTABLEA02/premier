import { useEffect, useCallback, useRef } from 'react';
import { useSessionPersistence } from './useSessionPersistence';
import { debounce } from 'lodash';

interface AutoSaveOptions {
  formId: string;
  data: any;
  enabled?: boolean;
  delay?: number; // délai en millisecondes
  onSave?: (data: any) => void;
  onLoad?: (data: any) => void;
}

export const useAutoSave = ({
  formId,
  data,
  enabled = true,
  delay = 2000,
  onSave,
  onLoad
}: AutoSaveOptions) => {
  const { saveDraft, loadDraft, deleteDraft } = useSessionPersistence();
  const previousDataRef = useRef<any>(null);
  const hasLoadedRef = useRef(false);

  // Fonction de sauvegarde avec debounce
  const debouncedSave = useCallback(
    debounce((dataToSave: any) => {
      if (enabled && dataToSave && Object.keys(dataToSave).length > 0) {
        saveDraft(formId, dataToSave);
        onSave?.(dataToSave);
        console.log(`💾 Brouillon sauvegardé pour ${formId}`);
      }
    }, delay),
    [formId, enabled, delay, saveDraft, onSave]
  );

  // Charger le brouillon au montage
  useEffect(() => {
    if (enabled && !hasLoadedRef.current) {
      const draft = loadDraft(formId);
      if (draft) {
        onLoad?.(draft);
        console.log(`📂 Brouillon chargé pour ${formId}`);
      }
      hasLoadedRef.current = true;
    }
  }, [formId, enabled, loadDraft, onLoad]);

  // Sauvegarder automatiquement quand les données changent
  useEffect(() => {
    if (enabled && data && hasLoadedRef.current) {
      // Vérifier si les données ont réellement changé
      const dataString = JSON.stringify(data);
      const previousDataString = JSON.stringify(previousDataRef.current);
      
      if (dataString !== previousDataString) {
        debouncedSave(data);
        previousDataRef.current = data;
      }
    }
  }, [data, enabled, debouncedSave]);

  // Fonctions utilitaires
  const clearDraft = useCallback(() => {
    deleteDraft(formId);
    console.log(`🗑️ Brouillon supprimé pour ${formId}`);
  }, [formId, deleteDraft]);

  const hasDraft = useCallback(() => {
    return loadDraft(formId) !== null;
  }, [formId, loadDraft]);

  const getDraft = useCallback(() => {
    return loadDraft(formId);
  }, [formId, loadDraft]);

  // Nettoyage
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    clearDraft,
    hasDraft,
    getDraft,
    saveDraft: (dataToSave: any) => saveDraft(formId, dataToSave)
  };
};