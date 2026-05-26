'use client';

import React, { createContext, useContext } from 'react';
import {
  Check,
  AlertCircle,
  ChevronRight,
  Loader2,
  Save,
  X,
  RotateCcw,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseFormTabsReturn } from '@/hooks/useFormTabs';
import type { UseFormWizardReturn } from '@/hooks/useFormWizard';
import type { UseFormDraftReturn } from '@/hooks/useFormDraft';
import type { UseUnsavedChangesReturn } from '@/hooks/useUnsavedChanges';
import type { FieldValues } from 'react-hook-form';

// ============================================================================
// CONTEXT
// ============================================================================

interface FormShellContextValue {
  formTabs?: UseFormTabsReturn<FieldValues>;
  formWizard?: UseFormWizardReturn<FieldValues>;
  formDraft?: UseFormDraftReturn<FieldValues>;
  unsavedChanges?: UseUnsavedChangesReturn;
  isSubmitting?: boolean;
}

const FormShellContext = createContext<FormShellContextValue>({});

function useFormShellContext() {
  return useContext(FormShellContext);
}

// ============================================================================
// TYPES
// ============================================================================

export interface FormShellProps {
  /** Form tabs hook return */
  formTabs?: UseFormTabsReturn<FieldValues>;
  /** Form wizard hook return */
  formWizard?: UseFormWizardReturn<FieldValues>;
  /** Form draft hook return */
  formDraft?: UseFormDraftReturn<FieldValues>;
  /** Unsaved changes hook return */
  unsavedChanges?: UseUnsavedChangesReturn;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Children */
  children: React.ReactNode;
  /** Container className */
  className?: string;
  /** Form element props */
  onSubmit?: (e: React.FormEvent) => void;
}

export interface FormShellTabsProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export interface FormShellTabProps {
  tabId: string;
  children?: React.ReactNode;
  className?: string;
}

export interface FormShellSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Only render when this tab is active */
  tabId?: string;
  /** Only render when this step is active (wizard) */
  stepIndex?: number;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Collapsible section */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

export interface FormShellActionsProps {
  children?: React.ReactNode;
  className?: string;
  /** Show cancel button */
  showCancel?: boolean;
  /** Show save draft button */
  showSaveDraft?: boolean;
  /** Show reset button */
  showReset?: boolean;
  /** Cancel handler */
  onCancel?: () => void;
  /** Reset handler */
  onReset?: () => void;
  /** Submit text */
  submitText?: string;
  /** Cancel text */
  cancelText?: string;
}

export interface FormShellProgressProps {
  className?: string;
  showSteps?: boolean;
  showPercentage?: boolean;
}

export interface FormShellWizardNavProps {
  className?: string;
  showBack?: boolean;
  showNext?: boolean;
  nextText?: string;
  backText?: string;
  completeText?: string;
}

export interface FormShellDraftBannerProps {
  className?: string;
  showDiscard?: boolean;
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

function FormShellRoot({
  formTabs,
  formWizard,
  formDraft,
  unsavedChanges,
  isSubmitting = false,
  children,
  className,
  onSubmit,
}: FormShellProps) {
  return (
    <FormShellContext.Provider
      value={{ formTabs, formWizard, formDraft, unsavedChanges, isSubmitting }}
    >
      <form
        onSubmit={onSubmit}
        className={cn('flex flex-col', className)}
      >
        {children}
      </form>
    </FormShellContext.Provider>
  );
}

// ============================================================================
// TABS COMPONENT
// ============================================================================

function FormShellTabs({
  children,
  className,
  variant = 'default',
}: FormShellTabsProps) {
  const { formTabs } = useFormShellContext();

  if (!formTabs) {
    return <div className={className}>{children}</div>;
  }

  const variantClasses = {
    default: 'border-b',
    pills: 'gap-2 p-1 bg-muted rounded-lg',
    underline: 'border-b',
  };

  return (
    <div
      role="tablist"
      className={cn('flex', variantClasses[variant], className)}
    >
      {children ??
        formTabs.visibleTabs.map((tab) => (
          <FormShellTab key={tab.id} tabId={tab.id}>
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </FormShellTab>
        ))}
    </div>
  );
}

// ============================================================================
// TAB COMPONENT
// ============================================================================

function FormShellTab({ tabId, children, className }: FormShellTabProps) {
  const { formTabs } = useFormShellContext();

  if (!formTabs) return null;

  const isActive = formTabs.isTabActive(tabId);
  const isDisabled = formTabs.isTabDisabled(tabId);
  const hasErrors = formTabs.tabHasErrors(tabId);
  const tab = formTabs.tabs.find((t) => t.id === tabId);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={isDisabled}
      onClick={() => formTabs.setActiveTab(tabId)}
      disabled={isDisabled}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isActive
          ? 'border-b-2 border-primary text-primary'
          : 'text-muted-foreground hover:text-foreground',
        isDisabled && 'cursor-not-allowed opacity-50',
        hasErrors && 'text-destructive',
        className
      )}
    >
      {children ?? tab?.label}
      {hasErrors && (
        <AlertCircle className="h-4 w-4 text-destructive" />
      )}
    </button>
  );
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

function FormShellSection({
  children,
  className,
  tabId,
  stepIndex,
  title,
  description,
  collapsible = false,
  defaultCollapsed = false,
}: FormShellSectionProps) {
  const { formTabs, formWizard } = useFormShellContext();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  // Check visibility based on tab
  if (tabId && formTabs) {
    if (!formTabs.isTabActive(tabId)) {
      return null;
    }
  }

  // Check visibility based on wizard step
  if (stepIndex !== undefined && formWizard) {
    if (formWizard.currentStep !== stepIndex) {
      return null;
    }
  }

  const header = (title || description) && (
    <div
      className={cn(
        'mb-4',
        collapsible && 'cursor-pointer select-none'
      )}
      onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
    >
      <div className="flex items-center gap-2">
        {collapsible && (
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              !isCollapsed && 'rotate-90'
            )}
          />
        )}
        {title && (
          <h3 className="text-lg font-semibold">{title}</h3>
        )}
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );

  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      {header}
      {(!collapsible || !isCollapsed) && children}
    </div>
  );
}

// ============================================================================
// ACTIONS COMPONENT
// ============================================================================

function FormShellActions({
  children,
  className,
  showCancel = true,
  showSaveDraft = false,
  showReset = false,
  onCancel,
  onReset,
  submitText = 'Save',
  cancelText = 'Cancel',
}: FormShellActionsProps) {
  const { formDraft, isSubmitting } = useFormShellContext();

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t bg-background p-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showSaveDraft && formDraft && (
          <button
            type="button"
            onClick={formDraft.save}
            disabled={formDraft.isSaving}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {formDraft.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </button>
        )}

        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <X className="h-4 w-4" />
            {cancelText}
          </button>
        )}

        {children ?? (
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {submitText}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WIZARD PROGRESS COMPONENT
// ============================================================================

function FormShellProgress({
  className,
  showSteps = true,
  showPercentage = false,
}: FormShellProgressProps) {
  const { formWizard } = useFormShellContext();

  if (!formWizard) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${formWizard.progress}%` }}
          />
        </div>
        {showPercentage && (
          <span className="text-sm font-medium text-muted-foreground">
            {formWizard.progress}%
          </span>
        )}
      </div>

      {/* Step indicators */}
      {showSteps && (
        <div className="flex items-center justify-between">
          {formWizard.visibleSteps.map((step, index) => {
            const status = formWizard.getStepStatus(index);
            const isAccessible = formWizard.isStepAccessible(index);

            return (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => formWizard.goToStep(index)}
                  disabled={!isAccessible}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    status === 'current' && 'bg-primary text-primary-foreground',
                    status === 'completed' && 'bg-primary/20 text-primary',
                    status === 'error' && 'bg-destructive/20 text-destructive',
                    status === 'upcoming' && 'bg-muted text-muted-foreground',
                    !isAccessible && 'cursor-not-allowed'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : status === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                <span className="text-xs text-muted-foreground">
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WIZARD NAVIGATION COMPONENT
// ============================================================================

function FormShellWizardNav({
  className,
  showBack = true,
  showNext = true,
  nextText = 'Next',
  backText = 'Back',
  completeText = 'Complete',
}: FormShellWizardNavProps) {
  const { formWizard, isSubmitting } = useFormShellContext();

  if (!formWizard) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t bg-background p-4',
        className
      )}
    >
      <div>
        {showBack && !formWizard.isFirstStep && (
          <button
            type="button"
            onClick={formWizard.back}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            {backText}
          </button>
        )}
      </div>

      <div>
        {showNext && (
          formWizard.isLastStep ? (
            <button
              type="button"
              onClick={formWizard.complete}
              disabled={isSubmitting || formWizard.isCompleting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {formWizard.isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {completeText}
            </button>
          ) : (
            <button
              type="button"
              onClick={formWizard.next}
              disabled={!formWizard.canProceed}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {nextText}
              <ChevronRight className="h-4 w-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DRAFT BANNER COMPONENT
// ============================================================================

function FormShellDraftBanner({
  className,
  showDiscard = true,
}: FormShellDraftBannerProps) {
  const { formDraft } = useFormShellContext();

  if (!formDraft?.hasDraft) return null;

  const savedAt = formDraft.draftMetadata?.savedAt
    ? new Date(formDraft.draftMetadata.savedAt)
    : null;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Save className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-800 dark:text-amber-200">
          You have a saved draft
          {savedAt && (
            <span className="text-amber-600 dark:text-amber-400">
              {' '}from {savedAt.toLocaleString()}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={formDraft.restore}
          className="rounded px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          Restore
        </button>
        {showDiscard && (
          <button
            type="button"
            onClick={formDraft.discard}
            className="rounded px-3 py-1 text-sm text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FIELD GROUP COMPONENT
// ============================================================================

export interface FormShellFieldGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

function FormShellFieldGroup({
  children,
  className,
  columns = 2,
}: FormShellFieldGroupProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridClasses[columns], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// ERROR SUMMARY COMPONENT
// ============================================================================

export interface FormShellErrorSummaryProps {
  errors: Record<string, { message?: string }>;
  className?: string;
}

function FormShellErrorSummary({
  errors,
  className,
}: FormShellErrorSummaryProps) {
  const errorMessages = Object.values(errors)
    .filter((e) => e?.message)
    .map((e) => e.message!);

  if (errorMessages.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/10 p-4',
        className
      )}
    >
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">
          Please fix the following errors:
        </span>
      </div>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-destructive">
        {errorMessages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// EXPORT COMPOUND COMPONENT
// ============================================================================

export const FormShell = Object.assign(FormShellRoot, {
  Tabs: FormShellTabs,
  Tab: FormShellTab,
  Section: FormShellSection,
  Actions: FormShellActions,
  Progress: FormShellProgress,
  WizardNav: FormShellWizardNav,
  DraftBanner: FormShellDraftBanner,
  FieldGroup: FormShellFieldGroup,
  ErrorSummary: FormShellErrorSummary,
});

// Types are exported inline with their interfaces
