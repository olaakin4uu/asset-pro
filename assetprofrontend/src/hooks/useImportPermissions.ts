import { usePermission } from './usePermission';

/**
 * Hook for checking import permissions for a specific entity.
 * Returns which import modes the user is allowed to use.
 */
export function useImportPermissions(entity: string) {
  const canImport = usePermission(`import ${entity}`);
  const canOverwrite = usePermission(`import-overwrite ${entity}`);

  return {
    canImport,         // Can access import page at all (skip + update modes)
    canOverwrite,      // Can use overwrite mode
  };
}
