'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'pdf' | 'excel' | 'csv';
export type ShareMethod = 'email' | 'whatsapp' | 'copy';
export type PrintType = 'item' | 'report';
export type PrintFormat = 'thermal' | 'a4';

export interface PrintOptions {
  type: PrintType;
  format: PrintFormat;
  dateFrom?: string;
  dateTo?: string;
}

export interface ToolbarAction<T> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void | Promise<void>;
  disabled?: boolean | ((item: T) => boolean);
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  hidden?: boolean | ((item: T) => boolean);
  tooltip?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface UseToolbarConfig<T> {
  entity: T;
  entityType: string;

  // Export
  onExport?: (format: ExportFormat, entity: T) => Promise<void>;

  // Share
  onShare?: (method: ShareMethod, entity: T) => Promise<void>;
  shareBaseUrl?: string;

  // Print
  onPrint?: (options: PrintOptions, entity: T) => Promise<void>;

  // CRUD
  onEdit?: (entity: T) => void;
  onDelete?: (entity: T) => Promise<void>;

  // Bookmarks & Favorites
  onBookmark?: (entity: T, bookmarked: boolean) => Promise<void>;
  onFavorite?: (entity: T, favorited: boolean) => Promise<void>;
  initialBookmarked?: boolean;
  initialFavorited?: boolean;

  // Custom actions
  customActions?: ToolbarAction<T>[];
}

export interface UseToolbarReturn<T> {
  // Entity
  entity: T;

  // Export
  exportAs: (format: ExportFormat) => Promise<void>;
  isExporting: boolean;
  exportFormats: ExportFormat[];

  // Share
  shareVia: (method: ShareMethod) => Promise<void>;
  isSharing: boolean;
  shareMethods: ShareMethod[];

  // Print
  openPrintDialog: () => void;
  closePrintDialog: () => void;
  isPrintDialogOpen: boolean;
  printOptions: PrintOptions;
  setPrintOptions: (options: Partial<PrintOptions>) => void;
  executePrint: () => Promise<void>;
  isPrinting: boolean;

  // CRUD
  edit: () => void;
  remove: () => Promise<void>;
  isDeleting: boolean;

  // Bookmarks & Favorites
  isBookmarked: boolean;
  isFavorited: boolean;
  toggleBookmark: () => Promise<void>;
  toggleFavorite: () => Promise<void>;

  // Custom actions
  customActions: ToolbarAction<T>[];
  executeAction: (actionId: string) => Promise<void>;
  isActionLoading: (actionId: string) => boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useToolbar<T extends { id: string | number }>(
  config: UseToolbarConfig<T>
): UseToolbarReturn<T> {
  const {
    entity,
    entityType,
    onExport,
    onShare,
    shareBaseUrl = typeof window !== 'undefined' ? window.location.origin : '',
    onPrint,
    onEdit,
    onDelete,
    onBookmark,
    onFavorite,
    initialBookmarked = false,
    initialFavorited = false,
    customActions = [],
  } = config;

  // State
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [actionLoadingState, setActionLoadingState] = useState<Record<string, boolean>>({});

  const [printOptions, setPrintOptionsState] = useState<PrintOptions>({
    type: 'item',
    format: 'a4',
    dateFrom: '',
    dateTo: '',
  });

  // Export formats
  const exportFormats: ExportFormat[] = ['pdf', 'excel', 'csv'];

  // Share methods
  const shareMethods: ShareMethod[] = ['email', 'whatsapp', 'copy'];

  // Export
  const exportAs = useCallback(
    async (format: ExportFormat) => {
      if (!onExport) {
        console.warn('Export handler not provided');
        return;
      }

      setIsExporting(true);
      try {
        await onExport(format, entity);
      } finally {
        setIsExporting(false);
      }
    },
    [entity, onExport]
  );

  // Share
  const shareVia = useCallback(
    async (method: ShareMethod) => {
      setIsSharing(true);
      try {
        if (onShare) {
          await onShare(method, entity);
        } else {
          // Default share behavior
          const url = `${shareBaseUrl}/${entityType}/${entity.id}`;

          switch (method) {
            case 'copy':
              await navigator.clipboard.writeText(url);
              break;
            case 'email': {
              const subject = encodeURIComponent(`Check out this ${entityType}`);
              const body = encodeURIComponent(`View details: ${url}`);
              window.open(`mailto:?subject=${subject}&body=${body}`);
              break;
            }
            case 'whatsapp': {
              const text = encodeURIComponent(`Check out this ${entityType}: ${url}`);
              window.open(`https://wa.me/?text=${text}`);
              break;
            }
          }
        }
      } finally {
        setIsSharing(false);
      }
    },
    [entity, entityType, shareBaseUrl, onShare]
  );

  // Print Dialog
  const openPrintDialog = useCallback(() => setIsPrintDialogOpen(true), []);
  const closePrintDialog = useCallback(() => setIsPrintDialogOpen(false), []);

  const setPrintOptions = useCallback((options: Partial<PrintOptions>) => {
    setPrintOptionsState((prev) => ({ ...prev, ...options }));
  }, []);

  const executePrint = useCallback(async () => {
    if (!onPrint) {
      // Use Electron silent print when available, otherwise browser print dialog
      if (typeof window !== 'undefined' && window.electronAPI) {
        setIsPrinting(true);
        try {
          const result = await window.electronAPI.print({
            content: document.documentElement.outerHTML,
            type: printOptions.format === 'thermal' ? 'thermal' : 'a4',
            silent: true,
          });
          if (!result.success) {
            console.error('Electron print failed:', result.error);
          }
        } finally {
          setIsPrinting(false);
        }
      } else {
        window.print();
      }
      setIsPrintDialogOpen(false);
      return;
    }

    setIsPrinting(true);
    try {
      await onPrint(printOptions, entity);
      setIsPrintDialogOpen(false);
    } finally {
      setIsPrinting(false);
    }
  }, [entity, printOptions, onPrint]);

  // CRUD
  const edit = useCallback(() => {
    onEdit?.(entity);
  }, [entity, onEdit]);

  const remove = useCallback(async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(entity);
    } finally {
      setIsDeleting(false);
    }
  }, [entity, onDelete]);

  // Bookmarks & Favorites
  const toggleBookmark = useCallback(async () => {
    const newState = !isBookmarked;
    setIsBookmarked(newState);
    await onBookmark?.(entity, newState);
  }, [entity, isBookmarked, onBookmark]);

  const toggleFavorite = useCallback(async () => {
    const newState = !isFavorited;
    setIsFavorited(newState);
    await onFavorite?.(entity, newState);
  }, [entity, isFavorited, onFavorite]);

  // Custom actions
  const executeAction = useCallback(
    async (actionId: string) => {
      const action = customActions.find((a) => a.id === actionId);
      if (!action) return;

      const isDisabled =
        typeof action.disabled === 'function'
          ? action.disabled(entity)
          : action.disabled;

      if (isDisabled || actionLoadingState[actionId]) return;

      setActionLoadingState((prev) => ({ ...prev, [actionId]: true }));
      try {
        await action.onClick(entity);
      } finally {
        setActionLoadingState((prev) => ({ ...prev, [actionId]: false }));
      }
    },
    [entity, customActions, actionLoadingState]
  );

  const isActionLoading = useCallback(
    (actionId: string) => !!actionLoadingState[actionId],
    [actionLoadingState]
  );

  return {
    entity,
    exportAs,
    isExporting,
    exportFormats,
    shareVia,
    isSharing,
    shareMethods,
    openPrintDialog,
    closePrintDialog,
    isPrintDialogOpen,
    printOptions,
    setPrintOptions,
    executePrint,
    isPrinting,
    edit,
    remove,
    isDeleting,
    isBookmarked,
    isFavorited,
    toggleBookmark,
    toggleFavorite,
    customActions,
    executeAction,
    isActionLoading,
  };
}
