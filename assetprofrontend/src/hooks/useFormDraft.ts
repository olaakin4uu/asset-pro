'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

// ============================================================================
// TYPES
// ============================================================================

export interface DraftMetadata {
  /** When the draft was last saved */
  savedAt: string;
  /** Version for conflict detection */
  version: number;
  /** Optional entity ID (for edit forms) */
  entityId?: string | number;
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

export interface StoredDraft<T> {
  data: T;
  metadata: DraftMetadata;
}

export interface UseFormDraftConfig<T extends FieldValues = FieldValues> {
  /** Unique key for localStorage */
  key: string;
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Auto-save debounce delay in ms (0 to disable) */
  debounceMs?: number;
  /** Enable auto-save */
  autoSave?: boolean;
  /** Fields to exclude from draft */
  excludeFields?: string[];
  /** Entity ID for edit forms */
  entityId?: string | number;
  /** Storage to use (default: localStorage) */
  storage?: Storage;
  /** Callback when draft is saved */
  onSave?: (data: T) => void;
  /** Callback when draft is restored */
  onRestore?: (data: T) => void;
  /** Callback when draft is discarded */
  onDiscard?: () => void;
  /** Transform data before saving */
  transformOnSave?: (data: T) => T;
  /** Transform data after restoring */
  transformOnRestore?: (data: T) => T;
}

export interface UseFormDraftReturn<T extends FieldValues = FieldValues> {
  // State
  hasDraft: boolean;
  draftMetadata: DraftMetadata | null;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Actions
  save: () => void;
  restore: () => boolean;
  discard: () => void;

  // Auto-save control
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  isAutoSaveEnabled: boolean;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

function getStorageKey(key: string, entityId?: string | number): string {
  return entityId ? `form-draft-${key}-${entityId}` : `form-draft-${key}`;
}

function loadDraft<T>(
  storage: Storage,
  key: string,
  entityId?: string | number
): StoredDraft<T> | null {
  try {
    const stored = storage.getItem(getStorageKey(key, entityId));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveDraft<T>(
  storage: Storage,
  key: string,
  data: T,
  metadata: DraftMetadata,
  entityId?: string | number
): void {
  try {
    const draft: StoredDraft<T> = { data, metadata };
    storage.setItem(getStorageKey(key, entityId), JSON.stringify(draft));
  } catch (error) {
    console.warn('Failed to save draft:', error);
  }
}

function deleteDraft(
  storage: Storage,
  key: string,
  entityId?: string | number
): void {
  try {
    storage.removeItem(getStorageKey(key, entityId));
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormDraft<T extends FieldValues = FieldValues>(
  config: UseFormDraftConfig<T>
): UseFormDraftReturn<T> {
  const {
    key,
    form,
    debounceMs = 1000,
    autoSave = true,
    excludeFields = [],
    entityId,
    storage = typeof window !== 'undefined' ? localStorage : null,
    onSave,
    onRestore,
    onDiscard,
    transformOnSave,
    transformOnRestore,
  } = config;

  // State
  const [hasDraft, setHasDraft] = useState(false);
  const [draftMetadata, setDraftMetadata] = useState<DraftMetadata | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(autoSave);

  // Refs
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const versionRef = useRef(1);

  // Filter out excluded fields
  const filterData = useCallback(
    (data: T): T => {
      if (excludeFields.length === 0) return data;

      const filtered = { ...data };
      for (const field of excludeFields) {
        delete (filtered as Record<string, unknown>)[field];
      }
      return filtered;
    },
    [excludeFields]
  );

  // Check for existing draft on mount
  useEffect(() => {
    if (!storage) return;

    const draft = loadDraft<T>(storage, key, entityId);
    if (draft) {
      setHasDraft(true);
      setDraftMetadata(draft.metadata);
      versionRef.current = draft.metadata.version + 1;
    }
  }, [storage, key, entityId]);

  // Save draft
  const save = useCallback(() => {
    if (!storage) return;

    setIsSaving(true);

    let data = filterData(form.getValues());

    // Transform if provided
    if (transformOnSave) {
      data = transformOnSave(data);
    }

    const metadata: DraftMetadata = {
      savedAt: new Date().toISOString(),
      version: versionRef.current++,
      entityId,
    };

    saveDraft(storage, key, data, metadata, entityId);

    setHasDraft(true);
    setDraftMetadata(metadata);
    setLastSavedAt(new Date());
    setIsSaving(false);

    onSave?.(data);
  }, [storage, key, entityId, form, filterData, transformOnSave, onSave]);

  // Restore draft
  const restore = useCallback((): boolean => {
    if (!storage) return false;

    const draft = loadDraft<T>(storage, key, entityId);
    if (!draft) return false;

    let data = draft.data;

    // Transform if provided
    if (transformOnRestore) {
      data = transformOnRestore(data);
    }

    // Reset form with draft data
    form.reset(data);

    onRestore?.(data);
    return true;
  }, [storage, key, entityId, form, transformOnRestore, onRestore]);

  // Discard draft
  const discard = useCallback(() => {
    if (!storage) return;

    deleteDraft(storage, key, entityId);

    setHasDraft(false);
    setDraftMetadata(null);
    setLastSavedAt(null);

    onDiscard?.();
  }, [storage, key, entityId, onDiscard]);

  // Auto-save on form changes
  useEffect(() => {
    if (!isAutoSaveEnabled || !storage || debounceMs === 0) return;

    const subscription = form.watch(() => {
      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new timeout
      debounceRef.current = setTimeout(() => {
        // Only save if form is dirty
        if (form.formState.isDirty) {
          save();
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isAutoSaveEnabled, storage, debounceMs, form, save]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Auto-save controls
  const enableAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(true);
  }, []);

  const disableAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(false);
  }, []);

  return {
    // State
    hasDraft,
    draftMetadata,
    isSaving,
    lastSavedAt,

    // Actions
    save,
    restore,
    discard,

    // Auto-save control
    enableAutoSave,
    disableAutoSave,
    isAutoSaveEnabled,
  };
}
