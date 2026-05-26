// Detail Viewer Headless Hooks
export { useDetailTabs } from './useDetailTabs';
export type { DetailTab, UseDetailTabsConfig, UseDetailTabsReturn } from './useDetailTabs';

export { useDetailActions } from './useDetailActions';
export type {
  ExportFormat,
  ShareMethod,
  PrintFormat,
  PrintType,
  ExportOptions,
  ShareOptions,
  PrintOptions,
  UseDetailActionsConfig,
  UseDetailActionsReturn,
} from './useDetailActions';

export { useDetailSidebar } from './useDetailSidebar';
export type {
  SidebarItem,
  UseDetailSidebarConfig,
  UseDetailSidebarReturn,
} from './useDetailSidebar';

// Toolbar Hook
export { useToolbar } from './useToolbar';
export type {
  ExportFormat as ToolbarExportFormat,
  ShareMethod as ToolbarShareMethod,
  PrintType as ToolbarPrintType,
  PrintFormat as ToolbarPrintFormat,
  PrintOptions as ToolbarPrintOptions,
  ToolbarAction,
  UseToolbarConfig,
  UseToolbarReturn,
} from './useToolbar';

// Data Table Hooks
export { useTablePagination } from './useTablePagination';
export type {
  UseTablePaginationConfig,
  UseTablePaginationReturn,
} from './useTablePagination';

export { useTableSort } from './useTableSort';
export type {
  SortDirection,
  SortState,
  UseTableSortConfig,
  UseTableSortReturn,
} from './useTableSort';

export { useTableSelection } from './useTableSelection';
export type {
  UseTableSelectionConfig,
  UseTableSelectionReturn,
} from './useTableSelection';

export { useTableFilters } from './useTableFilters';
export type {
  FilterOperator,
  FilterValue,
  FilterConfig,
  UseTableFiltersConfig,
  UseTableFiltersReturn,
} from './useTableFilters';

export { useTableColumns } from './useTableColumns';
export type {
  ColumnDefinition,
  UseTableColumnsConfig,
  UseTableColumnsReturn,
} from './useTableColumns';

export { useTableExport } from './useTableExport';
export type {
  TableExportFormat,
  ExportColumn,
  ExportOptions as TableExportOptions,
  UseTableExportConfig,
  UseTableExportReturn,
} from './useTableExport';

export { useDataTable } from './useDataTable';
export type {
  DataTableColumn,
  UseDataTableConfig,
  ServerFetchParams,
  UseDataTableReturn,
} from './useDataTable';

// Master-Detail Hooks
export { useMasterList } from './useMasterList';
export type {
  UseMasterListConfig,
  UseMasterListReturn,
  ListGroup,
} from './useMasterList';

export { useDetailPanel } from './useDetailPanel';
export type {
  PanelPosition,
  PanelMode,
  UseDetailPanelConfig,
  UseDetailPanelReturn,
} from './useDetailPanel';

export { useSplitPane } from './useSplitPane';
export type {
  SplitDirection,
  UseSplitPaneConfig,
  UseSplitPaneReturn,
} from './useSplitPane';

export { useKeyboardNav } from './useKeyboardNav';
export type {
  KeyboardKey,
  KeyboardShortcut,
  UseKeyboardNavConfig,
  UseKeyboardNavReturn,
} from './useKeyboardNav';

export {
  useUrlSync,
  useUrlParam,
  useUrlSelectedId,
  useUrlPage,
  useUrlSearch,
} from './useUrlSync';
export type {
  UrlParamValue,
  UrlParamConfig,
  UseUrlSyncConfig,
  UseUrlSyncReturn,
  UseUrlParamConfig,
  UseUrlParamReturn,
} from './useUrlSync';

// Form Hooks
export { useFormTabs } from './useFormTabs';
export type {
  FormTab,
  UseFormTabsConfig,
  UseFormTabsReturn,
} from './useFormTabs';

export { useFormWizard } from './useFormWizard';
export type {
  WizardStep,
  UseFormWizardConfig,
  UseFormWizardReturn,
} from './useFormWizard';

export { useFormDraft } from './useFormDraft';
export type {
  DraftMetadata,
  StoredDraft,
  UseFormDraftConfig,
  UseFormDraftReturn,
} from './useFormDraft';

export { useFormArrayFields } from './useFormArrayFields';
export type {
  UseFormArrayFieldsConfig,
  UseFormArrayFieldsReturn,
} from './useFormArrayFields';

export { useUnsavedChanges, UnsavedChangesDialog } from './useUnsavedChanges';
export type {
  UseUnsavedChangesConfig,
  UseUnsavedChangesReturn,
  UnsavedChangesDialogProps,
} from './useUnsavedChanges';

// Entity Detail Hook
export { useEntityDetail } from './useEntityDetail';
export type {
  UseEntityDetailConfig,
  UseEntityDetailReturn,
} from './useEntityDetail';

// Approval Hooks
export { useApproval, getApprovalStatusColor, getApprovalStatusLabel } from './useApproval';
export type {
  UseApprovalOptions,
  UseApprovalReturn,
} from './useApproval';

// Module & Feature Access Hooks
export { useModuleAccess } from './useModuleAccess';
export { useFeatureAccess } from './useFeatureAccess';

// Permission Hooks
export {
  usePermission,
  useAnyPermission,
  useAllPermissions,
  useEntityPermissions,
  useCanView,
  useCanCreate,
  useCanEdit,
  useCanDelete,
  useCanApprove,
  useHasRole,
  useHasAnyRole,
  useIsSuperAdmin,
} from './usePermission';

// Import Permission Hook
export { useImportPermissions } from './useImportPermissions';

// Tour Guide Hook
export { useTour } from './useTour';
export type {
  UseTourConfig,
  TourTargetRect,
  UseTourReturn,
} from './useTour';

// Command Palette Hook
export { useCommandPalette } from './useCommandPalette';
export type {
  SearchResult,
  SearchResultGroup,
  UseCommandPaletteConfig,
  UseCommandPaletteReturn,
} from './useCommandPalette';

// IIoT WebSocket Hook
export { useIiotWebSocket } from './useIiotWebSocket';
export type {
  TagValueUpdate,
  DeviceStatusUpdate,
  AlarmEventUpdate,
  AlarmNotification,
  WeightCaptureUpdate,
  IiotWebSocketState,
  UseIiotWebSocketOptions,
} from './useIiotWebSocket';

// Sales Settings Hook
export {
  useSalesSettings,
  useSalesSettingsContext,
  SalesSettingsProvider,
} from './useSalesSettings';
export type {
  UseSalesSettingsOptions,
  UseSalesSettingsReturn,
  SalesSettingsProviderProps,
} from './useSalesSettings';

// Settings Page Hook
export { useSettingsPage } from './useSettingsPage';
export type {
  UseSettingsPageConfig,
  UseSettingsPageReturn,
} from './useSettingsPage';

// Focus Trap Hook
export { useFocusTrap } from './useFocusTrap';
export type { UseFocusTrapConfig } from './useFocusTrap';

// Entity List Hook (TanStack Query wrapper)
export { useEntityList } from './useEntityList';
export type {
  PaginatedResponse,
  UseEntityListConfig,
  UseEntityListReturn,
} from './useEntityList';

// Entity Fetch Hook (Single entity by ID — TanStack Query wrapper)
export { useEntityFetch } from './useEntityFetch';
export type {
  UseEntityFetchConfig,
  UseEntityFetchReturn,
} from './useEntityFetch';

// Currency Format Hook
export { useCurrencyFormat, getCurrencySymbol } from './useCurrencyFormat';
export type { UseCurrencyFormatReturn } from './useCurrencyFormat';

// Contextual Help Hook
export { useContextualHelp } from './useContextualHelp';

// Branch Access Hook (for transaction forms)
export { useBranchAccess } from './useBranchAccess';
export type { UseBranchAccessReturn } from './useBranchAccess';
