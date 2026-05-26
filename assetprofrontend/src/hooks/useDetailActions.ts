'use client';

import { useCallback, useState } from 'react';

export type ExportFormat = 'pdf' | 'excel' | 'csv';
export type ShareMethod = 'email' | 'whatsapp' | 'copy-link';
export type PrintFormat = 'thermal' | 'a4';
export type PrintType = 'item' | 'report';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  dateRange?: { start: Date; end: Date };
}

export interface ShareOptions {
  method: ShareMethod;
  message?: string;
  recipient?: string;
}

export interface PrintOptions {
  format: PrintFormat;
  type: PrintType;
  copies?: number;
  showPreview?: boolean;
}

export interface UseDetailActionsConfig<T> {
  entity: T;
  entityType: string;
  onExport?: (options: ExportOptions, entity: T) => Promise<void>;
  onShare?: (options: ShareOptions, entity: T) => Promise<void>;
  onPrint?: (options: PrintOptions, entity: T) => Promise<void>;
  onEdit?: (entity: T) => void;
  onDelete?: (entity: T) => Promise<void>;
  onBookmark?: (entity: T, bookmarked: boolean) => Promise<void>;
  onFavorite?: (entity: T, favorited: boolean) => Promise<void>;
  baseUrl?: string;
}

export interface UseDetailActionsReturn<T> {
  // Export
  exportTo: (format: ExportFormat, options?: Partial<ExportOptions>) => Promise<void>;
  isExporting: boolean;

  // Share
  shareVia: (method: ShareMethod, options?: Partial<ShareOptions>) => Promise<void>;
  copyLink: () => Promise<void>;
  isSharing: boolean;

  // Print
  printAs: (format: PrintFormat, type: PrintType, options?: Partial<PrintOptions>) => Promise<void>;
  isPrinting: boolean;

  // CRUD
  edit: () => void;
  remove: () => Promise<void>;
  isDeleting: boolean;

  // Bookmarks & Favorites
  toggleBookmark: () => Promise<void>;
  toggleFavorite: () => Promise<void>;
  isBookmarked: boolean;
  isFavorited: boolean;

  // State
  entity: T;
}

export function useDetailActions<T extends { id: string | number }>(
  config: UseDetailActionsConfig<T>
): UseDetailActionsReturn<T> {
  const {
    entity,
    entityType,
    onExport,
    onShare,
    onPrint,
    onEdit,
    onDelete,
    onBookmark,
    onFavorite,
    baseUrl = typeof window !== 'undefined' ? window.location.origin : '',
  } = config;

  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Export
  const exportTo = useCallback(
    async (format: ExportFormat, options?: Partial<ExportOptions>) => {
      if (!onExport) {
        console.warn('Export handler not provided');
        return;
      }

      setIsExporting(true);
      try {
        await onExport(
          {
            format,
            filename: `${entityType}-${entity.id}`,
            includeHeaders: true,
            ...options,
          },
          entity
        );
      } finally {
        setIsExporting(false);
      }
    },
    [entity, entityType, onExport]
  );

  // Share
  const shareVia = useCallback(
    async (method: ShareMethod, options?: Partial<ShareOptions>) => {
      if (!onShare) {
        // Default share behavior
        const url = `${baseUrl}/${entityType}/${entity.id}`;

        if (method === 'copy-link') {
          await navigator.clipboard.writeText(url);
          return;
        }

        if (method === 'email') {
          const subject = encodeURIComponent(`Check out this ${entityType}`);
          const body = encodeURIComponent(`View details: ${url}`);
          window.open(`mailto:?subject=${subject}&body=${body}`);
          return;
        }

        if (method === 'whatsapp') {
          const text = encodeURIComponent(`Check out this ${entityType}: ${url}`);
          window.open(`https://wa.me/?text=${text}`);
          return;
        }
        return;
      }

      setIsSharing(true);
      try {
        await onShare({ method, ...options }, entity);
      } finally {
        setIsSharing(false);
      }
    },
    [entity, entityType, baseUrl, onShare]
  );

  const copyLink = useCallback(async () => {
    const url = `${baseUrl}/${entityType}/${entity.id}`;
    await navigator.clipboard.writeText(url);
  }, [entity, entityType, baseUrl]);

  // Print
  const printAs = useCallback(
    async (format: PrintFormat, type: PrintType, options?: Partial<PrintOptions>) => {
      if (!onPrint) {
        // Default print behavior
        window.print();
        return;
      }

      setIsPrinting(true);
      try {
        await onPrint(
          {
            format,
            type,
            copies: 1,
            showPreview: true,
            ...options,
          },
          entity
        );
      } finally {
        setIsPrinting(false);
      }
    },
    [entity, onPrint]
  );

  // Edit
  const edit = useCallback(() => {
    onEdit?.(entity);
  }, [entity, onEdit]);

  // Delete
  const remove = useCallback(async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(entity);
    } finally {
      setIsDeleting(false);
    }
  }, [entity, onDelete]);

  // Bookmark
  const toggleBookmark = useCallback(async () => {
    const newState = !isBookmarked;
    setIsBookmarked(newState);
    await onBookmark?.(entity, newState);
  }, [entity, isBookmarked, onBookmark]);

  // Favorite
  const toggleFavorite = useCallback(async () => {
    const newState = !isFavorited;
    setIsFavorited(newState);
    await onFavorite?.(entity, newState);
  }, [entity, isFavorited, onFavorite]);

  return {
    exportTo,
    isExporting,
    shareVia,
    copyLink,
    isSharing,
    printAs,
    isPrinting,
    edit,
    remove,
    isDeleting,
    toggleBookmark,
    toggleFavorite,
    isBookmarked,
    isFavorited,
    entity,
  };
}
