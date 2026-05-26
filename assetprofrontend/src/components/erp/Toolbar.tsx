'use client';

import React from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Star,
  StarOff,
  Download,
  Share2,
  Printer,
  Edit,
  Trash2,
  X,
  Mail,
  MessageCircle,
  Copy,
  FileText,
  FileSpreadsheet,
  Receipt,
  FileIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseToolbarReturn, ExportFormat, ShareMethod, PrintOptions } from '@/hooks/useToolbar';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolbarProps<T> {
  toolbar: UseToolbarReturn<T>;
  onClose?: () => void;
  showBookmark?: boolean;
  showFavorite?: boolean;
  showExport?: boolean;
  showShare?: boolean;
  showPrint?: boolean;
  printDisabled?: boolean;
  printDisabledTooltip?: string;
  showEdit?: boolean;
  showDelete?: boolean;
  showClose?: boolean;
  className?: string;
}

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  tooltip?: string;
  icon: React.ReactNode;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

function ToolbarButton({
  onClick,
  disabled,
  loading,
  variant = 'outline',
  tooltip,
  icon,
  label,
  showLabel = false,
  className,
}: ToolbarButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
    outline: 'border border-input bg-background hover:bg-muted focus:ring-primary',
    ghost: 'hover:bg-muted focus:ring-primary',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {showLabel && label && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

// ============================================================================
// DROPDOWN COMPONENT
// ============================================================================

interface ToolbarDropdownProps {
  trigger: React.ReactNode;
  items: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  disabled?: boolean;
}

function ToolbarDropdown({ trigger, items, disabled }: ToolbarDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => !disabled && setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              disabled={item.disabled}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PRINT DIALOG COMPONENT
// ============================================================================

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  options: PrintOptions;
  onOptionsChange: (options: Partial<PrintOptions>) => void;
  onPrint: () => void;
  isPrinting: boolean;
}

function PrintDialog({
  open,
  onClose,
  options,
  onOptionsChange,
  onPrint,
  isPrinting,
}: PrintDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg bg-background p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
        <h3 className="text-lg font-semibold">Print Options</h3>
        <p className="text-sm text-muted-foreground">
          Choose what to print and the format
        </p>

        <div className="mt-4 space-y-4">
          {/* Print Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Print Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOptionsChange({ type: 'item' })}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                  options.type === 'item'
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted'
                )}
              >
                <FileIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Single Item</div>
                  <div className="text-xs text-muted-foreground">Current record only</div>
                </div>
              </button>
              <button
                onClick={() => onOptionsChange({ type: 'report' })}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                  options.type === 'report'
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted'
                )}
              >
                <FileText className="h-5 w-5" />
                <div>
                  <div className="font-medium">Report</div>
                  <div className="text-xs text-muted-foreground">Date range report</div>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range (for reports) */}
          {options.type === 'report' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">From Date</label>
                <input
                  type="date"
                  value={options.dateFrom || ''}
                  onChange={(e) => onOptionsChange({ dateFrom: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">To Date</label>
                <input
                  type="date"
                  value={options.dateTo || ''}
                  onChange={(e) => onOptionsChange({ dateTo: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Print Format */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Print Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOptionsChange({ format: 'thermal' })}
                disabled={options.type === 'report'}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                  options.format === 'thermal' && options.type !== 'report'
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted',
                  options.type === 'report' && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Receipt className="h-5 w-5" />
                <div>
                  <div className="font-medium">Thermal</div>
                  <div className="text-xs text-muted-foreground">Receipt printer</div>
                </div>
              </button>
              <button
                onClick={() => onOptionsChange({ format: 'a4' })}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                  options.format === 'a4'
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted'
                )}
              >
                <FileText className="h-5 w-5" />
                <div>
                  <div className="font-medium">A4</div>
                  <div className="text-xs text-muted-foreground">Standard paper</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onPrint}
            disabled={isPrinting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPrinting ? 'Printing...' : 'Print'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN TOOLBAR COMPONENT
// ============================================================================

export function Toolbar<T extends { id: string | number }>({
  toolbar,
  onClose,
  showBookmark = true,
  showFavorite = true,
  showExport = true,
  showShare = true,
  showPrint = true,
  printDisabled = false,
  printDisabledTooltip = 'Print not available yet',
  showEdit = true,
  showDelete = true,
  showClose = true,
  className,
}: ToolbarProps<T>) {
  const exportItems = [
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Export as PDF',
      onClick: () => toolbar.exportAs('pdf'),
    },
    {
      icon: <FileSpreadsheet className="h-4 w-4" />,
      label: 'Export as Excel',
      onClick: () => toolbar.exportAs('excel'),
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Export as CSV',
      onClick: () => toolbar.exportAs('csv'),
    },
  ];

  const shareItems = [
    {
      icon: <Mail className="h-4 w-4" />,
      label: 'Send by Email',
      onClick: () => toolbar.shareVia('email'),
    },
    {
      icon: <MessageCircle className="h-4 w-4" />,
      label: 'Share on WhatsApp',
      onClick: () => toolbar.shareVia('whatsapp'),
    },
    {
      icon: <Copy className="h-4 w-4" />,
      label: 'Copy Link',
      onClick: () => toolbar.shareVia('copy'),
    },
  ];

  return (
    <>
      <div className={cn('flex items-center gap-1 lg:gap-2', className)}>
        {/* Bookmark & Favorite */}
        {(showBookmark || showFavorite) && (
          <div className="hidden items-center gap-1 lg:flex">
            {showBookmark && (
              <ToolbarButton
                onClick={toolbar.toggleBookmark}
                variant="ghost"
                tooltip={toolbar.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                icon={
                  toolbar.isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Bookmark className="h-4 w-4 text-muted-foreground" />
                  )
                }
              />
            )}
            {showFavorite && (
              <ToolbarButton
                onClick={toolbar.toggleFavorite}
                variant="ghost"
                tooltip={toolbar.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                icon={
                  toolbar.isFavorited ? (
                    <Star className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4 text-muted-foreground" />
                  )
                }
              />
            )}
          </div>
        )}

        {/* Export Dropdown */}
        {showExport && (
          <ToolbarDropdown
            trigger={
              <ToolbarButton
                onClick={() => {}}
                loading={toolbar.isExporting}
                tooltip="Export"
                icon={<Download className="h-4 w-4" />}
                label="Export"
                showLabel
              />
            }
            items={exportItems}
          />
        )}

        {/* Share Dropdown */}
        {showShare && (
          <ToolbarDropdown
            trigger={
              <ToolbarButton
                onClick={() => {}}
                loading={toolbar.isSharing}
                tooltip="Share"
                icon={<Share2 className="h-4 w-4" />}
                label="Share"
                showLabel
              />
            }
            items={shareItems}
          />
        )}

        {/* Print */}
        {showPrint && (
          <ToolbarButton
            onClick={toolbar.openPrintDialog}
            tooltip={printDisabled ? printDisabledTooltip : 'Print'}
            icon={<Printer className="h-4 w-4" />}
            disabled={printDisabled}
          />
        )}

        {/* Custom workflow actions (Void, Post to GL, Submit, Approve, etc.).
            Rendered between Print and Edit so they sit next to the standard
            lifecycle controls. Each action's visibility is decided upstream
            by whatever pushes into `customActions` — the toolbar just draws
            whatever's in the array. */}
        {toolbar.customActions.length > 0 && toolbar.customActions.map((action) => {
          const isHidden = typeof action.hidden === 'function' ? action.hidden(toolbar.entity) : !!action.hidden;
          if (isHidden) return null;
          const isDisabled = typeof action.disabled === 'function' ? action.disabled(toolbar.entity) : !!action.disabled;
          const Icon = action.icon;
          return (
            <ToolbarButton
              key={action.id}
              onClick={() => toolbar.executeAction(action.id)}
              loading={toolbar.isActionLoading(action.id)}
              disabled={isDisabled}
              variant={action.variant ?? 'default'}
              tooltip={action.tooltip ?? action.label}
              icon={Icon ? <Icon className="h-4 w-4" /> : undefined}
              label={action.label}
              showLabel
            />
          );
        })}

        {/* Edit */}
        {showEdit && (
          <ToolbarButton
            onClick={toolbar.edit}
            tooltip="Edit"
            icon={<Edit className="h-4 w-4" />}
            label="Edit"
            showLabel
          />
        )}

        {/* Delete */}
        {showDelete && (
          <ToolbarButton
            onClick={toolbar.remove}
            loading={toolbar.isDeleting}
            variant="destructive"
            tooltip="Delete"
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete"
            showLabel
          />
        )}

        {/* Close */}
        {showClose && onClose && (
          <ToolbarButton
            onClick={onClose}
            variant="outline"
            tooltip="Close"
            icon={<X className="h-4 w-4" />}
          />
        )}
      </div>

      {/* Print Dialog */}
      <PrintDialog
        open={toolbar.isPrintDialogOpen}
        onClose={toolbar.closePrintDialog}
        options={toolbar.printOptions}
        onOptionsChange={toolbar.setPrintOptions}
        onPrint={toolbar.executePrint}
        isPrinting={toolbar.isPrinting}
      />
    </>
  );
}
