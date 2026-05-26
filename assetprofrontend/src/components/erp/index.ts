// Access control components
export { AccessDenied } from './AccessDenied';
export { PermissionGate, EntityPermissionGate } from './PermissionGate';

// Offline / connectivity
export { OfflineBanner } from './OfflineBanner';
export { PendingWritesInspector } from './PendingWritesInspector';
export { FlockPendingBadge } from './FlockPendingBadge';

// Branch Selector (transaction form first field)
export { BranchSelector } from './BranchSelector';
export type { BranchSelectorProps } from './BranchSelector';

// Base Components
export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbsProps } from './Breadcrumbs';

export { DetailShell } from './DetailShell';

export {
  EntityDetailViewer,
  metadataFields,
  metadataTab,
  approvalFields,
  approvalSection,
} from './EntityDetailViewer';
export type {
  EntityDetailConfig,
  EntityDetailViewerProps,
  TabDef,
  SectionDef,
  FieldDef,
  BadgeDef,
  SidebarConfig,
  ToolbarConfig,
  HasTimestamps,
  HasApproval,
} from './EntityDetailViewer';
export type {
  DetailShellProps,
  DetailShellSidebarProps,
  DetailShellMainProps,
  DetailShellTabsProps,
  DetailShellTabProps,
  DetailShellContentProps,
  DetailShellActionsProps,
  DetailShellLayoutProps,
} from './DetailShell';

export { EntityCombobox } from './EntityCombobox';
export type { EntityItem, EntityComboboxProps } from './EntityCombobox';

export { ItemSearchCombobox } from './ItemSearchCombobox';
export type { ItemSearchComboboxProps, SearchableItem } from './ItemSearchCombobox';

export { QuickCreateDrawer } from './QuickCreateDrawer';
export type { QuickCreateDrawerProps, QuickCreateContext } from './QuickCreateDrawer';

export { Toolbar } from './Toolbar';
export type { ToolbarProps } from './Toolbar';

export { SuperAdminOverride } from './SuperAdminOverride';

export { PageHeader, PageHeaderPresets } from './PageHeader';
export type { PageHeaderProps, PageHeaderAction, PageHeaderBadge } from './PageHeader';
export { ReportHeader } from './ReportHeader';

export { DataTable } from './DataTable';
export type {
  DataTableProps,
  DataTableRootProps,
  DataTableContainerProps,
  DataTableToolbarProps,
  DataTableHeaderProps,
  DataTableColumnHeaderProps,
  DataTableBodyProps,
  DataTableRowProps,
  DataTableRowInternalProps,
  DataTableCellProps,
  DataTablePaginationProps,
  DataTableSelectionHeaderProps,
  DataTableSelectionCellProps,
  DataTableEmptyProps,
} from './DataTable';

export { MasterDetail } from './MasterDetail';
export type {
  MasterDetailProps,
  MasterDetailListProps,
  MasterDetailSearchProps,
  MasterDetailListItemProps,
  MasterDetailGroupProps,
  MasterDetailResizerProps,
  MasterDetailDetailProps,
  MasterDetailEmptyStateProps,
  MasterDetailLoadingProps,
  MasterDetailToolbarProps,
  MasterDetailListInfoProps,
  MasterDetailNavigationProps,
} from './MasterDetail';

export { FormShell } from './FormShell';
export type {
  FormShellProps,
  FormShellTabsProps,
  FormShellTabProps,
  FormShellSectionProps,
  FormShellActionsProps,
  FormShellProgressProps,
  FormShellWizardNavProps,
  FormShellDraftBannerProps,
  FormShellFieldGroupProps,
  FormShellErrorSummaryProps,
} from './FormShell';

export { ModuleLayout } from './ModuleLayout';
export type { ModuleLayoutProps, ModuleItem, ModuleInfo } from './ModuleLayout';

export { StatCard, StatCardColors, StatCardsGrid } from './StatCard';
export type { StatCardProps, StatCardColor, StatCardTrend, StatCardProgress, StatCardBadge, StatCardsGridProps } from './StatCard';

// Company Context Components
export { CompanySwitcher } from './CompanySwitcher';
export { CompanySwitchTransition } from './CompanySwitchTransition';

// Module Access Components
export { ModuleLockedView } from './ModuleLockedView';
export type { ModuleLockedViewProps } from './ModuleLockedView';

// Approval Components
export { ApprovalStatusBadge, ApprovalActions, ApprovalTimeline, ApprovalInfoCard } from './ApprovalActions';
export { ApprovalPanel, COMMON_ACTIONS } from './ApprovalPanel';
export type { ApprovalPanelConfig, ApprovalAction } from './ApprovalPanel';
export { ApprovalCelebration } from './ApprovalCelebration';

export { DraftSubmitActions } from './DraftSubmitActions';

// Tour Guide Components
export { TourOverlay } from './TourOverlay';
export type { TourOverlayProps } from './TourOverlay';

export { TourSelector } from './TourSelector';
export type { TourSelectorProps } from './TourSelector';

// Command Palette
export { CommandPalette } from './CommandPalette';
export type { CommandPaletteProps } from './CommandPalette';

// Help Drawer
export { HelpDrawer } from './HelpDrawer';
export type { HelpDrawerProps } from './HelpDrawer';

// Shared UI State Components
export { ErrorBanner } from './ErrorBanner';
export type { ErrorBannerProps } from './ErrorBanner';

export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { IdVerifyButton } from './IdVerifyButton';

// Accessible Form Primitives
export { FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { SettingToggle } from './SettingToggle';
export type { SettingToggleProps } from './SettingToggle';

// Import Overwrite Confirmation
export { ImportOverwriteDialog } from './ImportOverwriteDialog';
export type { ImportOverwriteDialogProps } from './ImportOverwriteDialog';

// Void With Date Dialog (shared void/cancel/reverse confirm with accounting date)
export { VoidWithDateDialog } from './VoidWithDateDialog';
export type { VoidWithDateDialogProps } from './VoidWithDateDialog';

// Stamp Visual
export { StampVisual } from './StampVisual';
export type { StampContent } from './StampVisual';

// Super Admin Approval Modal
export { SuperAdminApprovalModal } from './SuperAdminApprovalModal';

// Report Shell (shared skeleton for fund-management reports)
export { ReportShell, ReportStat, ReportTable, exportToCsv, exportToExcel, exportToPdf } from './ReportShell';
export type { ExportAction, ExcelSheet, PdfSection, PdfMeta } from './ReportShell';

// Idle session timeout warning dialog
export { IdleWarningDialog } from './IdleWarningDialog';

// Document Management System
export { DocumentAttachPanel } from './DocumentAttachPanel';

