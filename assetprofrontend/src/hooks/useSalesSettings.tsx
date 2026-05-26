import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { salesSettingsApi } from '@/lib/api/sales';
import type { SalesSettings } from '@/types/sales';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSalesSettingsOptions {
  /** Auto-fetch settings on mount (default: true) */
  autoFetch?: boolean;
}

export interface UseSalesSettingsReturn {
  /** The settings object */
  settings: SalesSettings | null;
  /** Whether settings are loading */
  loading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Refresh the settings */
  refresh: () => Promise<void>;

  // =========================================================================
  // INVENTORY HELPERS
  // =========================================================================
  /** Check if negative stock is allowed */
  canHaveNegativeStock: boolean;
  /** Check if stock should be validated strictly */
  hasStrictStockValidation: boolean;
  /** Check if stock should be reserved on order */
  shouldReserveStockOnOrder: boolean;
  /** Check if stock should be checked when creating orders */
  shouldCheckStockOnOrder: boolean;
  /** Check if stock should be checked when creating deliveries */
  shouldCheckStockOnDelivery: boolean;

  // =========================================================================
  // WORKFLOW HELPERS
  // =========================================================================
  /** Check if sales order is required before invoice */
  requiresSalesOrder: boolean;
  /** Check if delivery note is required before invoice */
  requiresDeliveryNote: boolean;
  /** Check if loading order is required */
  requiresLoadingOrder: boolean;
  /** Check if direct invoice (without order) is allowed */
  canCreateDirectInvoice: boolean;
  /** Check if partial delivery is allowed */
  canPartiallyDeliver: boolean;
  /** Check if partial invoicing is allowed */
  canPartiallyInvoice: boolean;
  /** Check if quote can be converted to order */
  canConvertQuoteToOrder: boolean;
  /** Check if order can be converted to delivery */
  canConvertOrderToDelivery: boolean;
  /** Check if delivery can be converted to invoice */
  canConvertDeliveryToInvoice: boolean;

  // =========================================================================
  // PRICING HELPERS
  // =========================================================================
  /** Check if price override is allowed */
  canOverridePrice: boolean;
  /** Check if price override requires approval */
  priceOverrideRequiresApproval: boolean;
  /** Get max discount percentage */
  maxDiscountPercent: number;
  /** Check if line item discount is allowed */
  canApplyLineItemDiscount: boolean;
  /** Check if order level discount is allowed */
  canApplyOrderLevelDiscount: boolean;
  /** Check if manual discount entry is allowed */
  canApplyManualDiscount: boolean;
  /** Check if discounts require approval */
  discountRequiresApproval: boolean;
  /** Validate discount amount */
  validateDiscount: (discountPercent: number) => { valid: boolean; message?: string };

  // =========================================================================
  // CUSTOMER HELPERS
  // =========================================================================
  /** Check if credit limit is enforced */
  enforcesCreditLimit: boolean;
  /** Check if on-hold customers can order */
  canOnHoldCustomersOrder: boolean;
  /** Check if customer PO number is required */
  requiresCustomerPoNumber: boolean;
  /** Check if overdue invoices should be checked */
  shouldCheckOverdueInvoices: boolean;
  /** Check if delivery address is required */
  requiresDeliveryAddress: boolean;
  /** Validate customer credit */
  validateCustomerCredit: (
    orderTotal: number,
    creditLimit: number,
    currentBalance: number
  ) => { valid: boolean; message?: string };

  // =========================================================================
  // APPROVAL HELPERS
  // =========================================================================
  /** Check if order approval is required */
  requiresOrderApproval: boolean;
  /** Check if invoice approval is required */
  requiresInvoiceApproval: boolean;
  /** Check if delivery approval is required */
  requiresDeliveryApproval: boolean;
  /** Check if approved orders are locked */
  areApprovedOrdersLocked: boolean;
  /** Get auto-approve threshold */
  autoApproveThreshold: number | null;
  /** Check if order should be auto-approved based on amount */
  shouldAutoApprove: (orderTotal: number) => boolean;

  // =========================================================================
  // RETURNS HELPERS
  // =========================================================================
  /** Check if returns are allowed */
  canProcessReturns: boolean;
  /** Check if partial returns are allowed */
  canProcessPartialReturns: boolean;
  /** Check if return requires approval */
  returnRequiresApproval: boolean;
  /** Check if order cancellation is allowed */
  canCancelOrders: boolean;
  /** Check if cancellation requires approval */
  cancellationRequiresApproval: boolean;
  /** Check if cancellation reason is required */
  cancellationReasonRequired: boolean;
  /** Get return window in days */
  returnWindowDays: number;

  // =========================================================================
  // PAYMENT HELPERS
  // =========================================================================
  /** Get default payment terms */
  defaultPaymentTerms: string;
  /** Check if deposit is required */
  requiresDeposit: boolean;
  /** Get default deposit percentage */
  defaultDepositPercent: number;
  /** Check if partial payments are allowed */
  canAcceptPartialPayments: boolean;

  // =========================================================================
  // TAX HELPERS
  // =========================================================================
  /** Check if tax should be auto-calculated */
  shouldAutoCalculateTax: boolean;
  /** Check if withholding tax applies */
  shouldApplyWithholdingTax: boolean;
  /** Check if prices are tax-inclusive */
  hasTaxInclusivePricing: boolean;

  // =========================================================================
  // MISC HELPERS
  // =========================================================================
  /** Get quote validity in days */
  quoteValidityDays: number;
  /** Check if warehouse selection is required */
  requiresWarehouseSelection: boolean;
  /** Get minimum order amount */
  minimumOrderAmount: number | null;
  /** Get maximum order amount */
  maximumOrderAmount: number | null;
  /** Check if backorders are allowed */
  canPlaceBackorders: boolean;
  /** Validate order amount */
  validateOrderAmount: (total: number) => { valid: boolean; message?: string };
}

// ============================================================================
// CONTEXT
// ============================================================================

const SalesSettingsContext = createContext<UseSalesSettingsReturn | null>(null);

export interface SalesSettingsProviderProps {
  children: ReactNode;
}

/**
 * Provider component to make sales settings available throughout the sales module.
 * Wrap your sales module layout with this provider.
 */
export function SalesSettingsProvider({ children }: SalesSettingsProviderProps) {
  const settings = useSalesSettings({ autoFetch: true });

  return (
    <SalesSettingsContext.Provider value={settings}>
      {children}
    </SalesSettingsContext.Provider>
  );
}

/**
 * Hook to access sales settings from context.
 * Must be used within a SalesSettingsProvider.
 */
export function useSalesSettingsContext(): UseSalesSettingsReturn {
  const context = useContext(SalesSettingsContext);
  if (!context) {
    throw new Error('useSalesSettingsContext must be used within a SalesSettingsProvider');
  }
  return context;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook to fetch and use sales settings.
 * Provides the raw settings object plus many derived helpers for common validations.
 */
export function useSalesSettings(options: UseSalesSettingsOptions = {}): UseSalesSettingsReturn {
  const { autoFetch = true } = options;

  const [settings, setSettings] = useState<SalesSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesSettingsApi.get();
      setSettings(data);
    } catch (err: unknown) {
      setError(err.response?.data?.message || 'Failed to load sales settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchSettings();
    }
  }, [autoFetch, fetchSettings]);

  // =========================================================================
  // DERIVED VALUES (memoized)
  // =========================================================================

  const derivedValues = useMemo(() => {
    const s = settings;

    // Default values when settings not loaded
    const defaults = {
      // Inventory
      canHaveNegativeStock: false,
      hasStrictStockValidation: true,
      shouldReserveStockOnOrder: false,
      shouldCheckStockOnOrder: true,
      shouldCheckStockOnDelivery: true,

      // Workflow
      requiresSalesOrder: false,
      requiresDeliveryNote: false,
      requiresLoadingOrder: false,
      canCreateDirectInvoice: true,
      canPartiallyDeliver: true,
      canPartiallyInvoice: true,
      canConvertQuoteToOrder: true,
      canConvertOrderToDelivery: true,
      canConvertDeliveryToInvoice: true,

      // Pricing
      canOverridePrice: false,
      priceOverrideRequiresApproval: true,
      maxDiscountPercent: 0,
      canApplyLineItemDiscount: false,
      canApplyOrderLevelDiscount: false,
      canApplyManualDiscount: false,
      discountRequiresApproval: true,

      // Customer
      enforcesCreditLimit: false,
      canOnHoldCustomersOrder: false,
      requiresCustomerPoNumber: false,
      shouldCheckOverdueInvoices: true,
      requiresDeliveryAddress: false,

      // Approval
      requiresOrderApproval: false,
      requiresInvoiceApproval: false,
      requiresDeliveryApproval: false,
      areApprovedOrdersLocked: true,
      autoApproveThreshold: null as number | null,

      // Returns
      canProcessReturns: false,
      canProcessPartialReturns: false,
      returnRequiresApproval: true,
      canCancelOrders: true,
      cancellationRequiresApproval: false,
      cancellationReasonRequired: false,
      returnWindowDays: 30,

      // Payment
      defaultPaymentTerms: 'Net 30',
      requiresDeposit: false,
      defaultDepositPercent: 0,
      canAcceptPartialPayments: true,

      // Tax
      shouldAutoCalculateTax: true,
      shouldApplyWithholdingTax: false,
      hasTaxInclusivePricing: false,

      // Misc
      quoteValidityDays: 30,
      requiresWarehouseSelection: false,
      minimumOrderAmount: null as number | null,
      maximumOrderAmount: null as number | null,
      canPlaceBackorders: false,
    };

    if (!s) return defaults;

    return {
      // Inventory
      canHaveNegativeStock: s.allowNegativeStock,
      hasStrictStockValidation: s.strictStockValidation,
      shouldReserveStockOnOrder: s.reserveStockOnOrder,
      shouldCheckStockOnOrder: s.checkStockOnOrder,
      shouldCheckStockOnDelivery: s.checkStockOnDelivery,

      // Workflow
      requiresSalesOrder: s.requireSalesOrder,
      requiresDeliveryNote: s.requireDeliveryNote,
      requiresLoadingOrder: s.requireLoadingOrder,
      canCreateDirectInvoice: s.allowDirectInvoice,
      canPartiallyDeliver: s.allowPartialDelivery,
      canPartiallyInvoice: s.allowPartialInvoicing,
      canConvertQuoteToOrder: s.allowQuoteToOrder,
      canConvertOrderToDelivery: s.allowOrderToDelivery,
      canConvertDeliveryToInvoice: s.allowDeliveryToInvoice,

      // Pricing
      canOverridePrice: s.allowPriceOverride,
      priceOverrideRequiresApproval: s.requireApprovalForPriceOverride,
      maxDiscountPercent: s.maxDiscountPercentage,
      canApplyLineItemDiscount: s.allowLineItemDiscount,
      canApplyOrderLevelDiscount: s.allowOrderLevelDiscount,
      canApplyManualDiscount: s.allowManualDiscount,
      discountRequiresApproval: s.requireDiscountApproval,

      // Customer
      enforcesCreditLimit: s.enforceCreditLimit,
      canOnHoldCustomersOrder: s.allowOnHoldCustomers,
      requiresCustomerPoNumber: s.requireCustomerPoNumber,
      shouldCheckOverdueInvoices: s.checkOverdueInvoices,
      requiresDeliveryAddress: s.requireDeliveryAddress,

      // Approval
      requiresOrderApproval: s.requireOrderApproval,
      requiresInvoiceApproval: s.requireInvoiceApproval,
      requiresDeliveryApproval: s.requireDeliveryApproval,
      areApprovedOrdersLocked: s.lockApprovedOrders,
      autoApproveThreshold: s.autoApproveBelowAmount,

      // Returns
      canProcessReturns: s.allowReturns || s.allowSalesReturns,
      canProcessPartialReturns: s.allowPartialReturns,
      returnRequiresApproval: s.requireReturnApproval,
      canCancelOrders: s.allowOrderCancellation,
      cancellationRequiresApproval: s.requireApprovalForCancellation,
      cancellationReasonRequired: s.cancellationReasonRequired,
      returnWindowDays: s.returnWindowDays,

      // Payment
      defaultPaymentTerms: s.defaultPaymentTerms,
      requiresDeposit: s.requireDeposit,
      defaultDepositPercent: s.defaultDepositPercentage,
      canAcceptPartialPayments: s.allowPartialPayments,

      // Tax
      shouldAutoCalculateTax: s.autoCalculateTax,
      shouldApplyWithholdingTax: s.applyWithholdingTax,
      hasTaxInclusivePricing: s.applyTaxInclusive,

      // Misc
      quoteValidityDays: s.quoteValidityDays,
      requiresWarehouseSelection: s.requireWarehouseSelection,
      minimumOrderAmount: s.minimumOrderAmount,
      maximumOrderAmount: s.maximumOrderAmount,
      canPlaceBackorders: s.allowBackorders,
    };
  }, [settings]);

  // =========================================================================
  // VALIDATION HELPERS
  // =========================================================================

  const validateDiscount = useCallback(
    (discountPercent: number): { valid: boolean; message?: string } => {
      if (!settings) {
        return { valid: true };
      }

      if (discountPercent < 0) {
        return { valid: false, message: 'Discount cannot be negative' };
      }

      if (discountPercent > settings.maxDiscountPercentage) {
        return {
          valid: false,
          message: `Discount cannot exceed ${settings.maxDiscountPercentage}%`,
        };
      }

      return { valid: true };
    },
    [settings]
  );

  const validateCustomerCredit = useCallback(
    (
      orderTotal: number,
      creditLimit: number,
      currentBalance: number
    ): { valid: boolean; message?: string } => {
      if (!settings || !settings.enforceCreditLimit) {
        return { valid: true };
      }

      const newBalance = currentBalance + orderTotal;
      if (newBalance > creditLimit) {
        return {
          valid: false,
          message: `Order would exceed credit limit. Available: ₦${(creditLimit - currentBalance).toLocaleString()}`,
        };
      }

      return { valid: true };
    },
    [settings]
  );

  const shouldAutoApprove = useCallback(
    (orderTotal: number): boolean => {
      if (!settings || !settings.autoApproveBelowAmount) {
        return false;
      }
      return orderTotal < settings.autoApproveBelowAmount;
    },
    [settings]
  );

  const validateOrderAmount = useCallback(
    (total: number): { valid: boolean; message?: string } => {
      if (!settings) {
        return { valid: true };
      }

      if (settings.minimumOrderAmount && total < settings.minimumOrderAmount) {
        return {
          valid: false,
          message: `Minimum order amount is ₦${settings.minimumOrderAmount.toLocaleString()}`,
        };
      }

      if (settings.maximumOrderAmount && total > settings.maximumOrderAmount) {
        return {
          valid: false,
          message: `Maximum order amount is ₦${settings.maximumOrderAmount.toLocaleString()}`,
        };
      }

      return { valid: true };
    },
    [settings]
  );

  return {
    settings,
    loading,
    error,
    refresh: fetchSettings,

    // Spread all derived values
    ...derivedValues,

    // Validation helpers
    validateDiscount,
    validateCustomerCredit,
    shouldAutoApprove,
    validateOrderAmount,
  };
}

export default useSalesSettings;
