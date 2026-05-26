'use client';

import { useState, useCallback, useMemo } from 'react';
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form';

// ============================================================================
// TYPES
// ============================================================================

export interface WizardStep<T extends FieldValues = FieldValues> {
  /** Unique step ID */
  id: string;
  /** Display title */
  title: string;
  /** Step description */
  description?: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Fields belonging to this step (for validation) */
  fields: Path<T>[];
  /** Custom validation function */
  validate?: (data: T) => boolean | Promise<boolean>;
  /** Whether step can be skipped */
  optional?: boolean;
  /** Whether step is hidden */
  hidden?: boolean;
}

export interface UseFormWizardConfig<T extends FieldValues = FieldValues> {
  /** Step definitions */
  steps: WizardStep<T>[];
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Initial step index */
  initialStep?: number;
  /** Allow going back to previous steps */
  allowBack?: boolean;
  /** Allow jumping to any completed step */
  allowJump?: boolean;
  /** Validate step before proceeding */
  validateOnNext?: boolean;
  /** Callback when step changes */
  onStepChange?: (step: number, direction: 'next' | 'back' | 'jump') => void;
  /** Callback when wizard completes */
  onComplete?: (data: T) => void | Promise<void>;
  /** Callback when validation fails */
  onValidationFail?: (stepId: string, errors: string[]) => void;
}

export interface UseFormWizardReturn<T extends FieldValues = FieldValues> {
  // State
  currentStep: number;
  currentStepData: WizardStep<T> | undefined;
  steps: WizardStep<T>[];
  visibleSteps: WizardStep<T>[];

  // Progress
  progress: number;
  completedSteps: number[];
  isFirstStep: boolean;
  isLastStep: boolean;
  totalSteps: number;

  // Navigation
  next: () => Promise<boolean>;
  back: () => void;
  goToStep: (step: number) => Promise<boolean>;
  reset: () => void;

  // Validation
  validateCurrentStep: () => Promise<boolean>;
  canProceed: boolean;
  stepHasErrors: (step: number) => boolean;
  getStepErrors: (step: number) => string[];

  // Completion
  complete: () => Promise<boolean>;
  isCompleting: boolean;

  // Helpers
  isStepCompleted: (step: number) => boolean;
  isStepAccessible: (step: number) => boolean;
  getStepStatus: (step: number) => 'completed' | 'current' | 'upcoming' | 'error';
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormWizard<T extends FieldValues = FieldValues>(
  config: UseFormWizardConfig<T>
): UseFormWizardReturn<T> {
  const {
    steps,
    form,
    initialStep = 0,
    allowBack = true,
    allowJump = false,
    validateOnNext = true,
    onStepChange,
    onComplete,
    onValidationFail,
  } = config;

  // State
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  // Visible steps
  const visibleSteps = useMemo(
    () => steps.filter((step) => !step.hidden),
    [steps]
  );

  // Current step data
  const currentStepData = visibleSteps[currentStep];
  const totalSteps = visibleSteps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Progress percentage
  const progress = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round(((currentStep + 1) / totalSteps) * 100);
  }, [currentStep, totalSteps]);

  // Get errors for a specific step
  const getStepErrors = useCallback(
    (step: number): string[] => {
      const stepData = visibleSteps[step];
      if (!stepData) return [];

      const errors: string[] = [];
      const formErrors = form.formState.errors;

      for (const field of stepData.fields) {
        const fieldError = formErrors[field as keyof typeof formErrors];
        if (fieldError?.message) {
          errors.push(String(fieldError.message));
        }
      }

      return errors;
    },
    [visibleSteps, form.formState.errors]
  );

  // Check if step has errors
  const stepHasErrors = useCallback(
    (step: number): boolean => {
      return getStepErrors(step).length > 0;
    },
    [getStepErrors]
  );

  // Validate current step
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!currentStepData) return true;

    // Trigger validation for step fields
    const fieldResults = await Promise.all(
      currentStepData.fields.map((field) => form.trigger(field))
    );

    const fieldsValid = fieldResults.every(Boolean);
    if (!fieldsValid) return false;

    // Run custom validation if provided
    if (currentStepData.validate) {
      const customValid = await currentStepData.validate(form.getValues());
      return customValid;
    }

    return true;
  }, [currentStepData, form]);

  // Check if can proceed to next step
  const canProceed = useMemo(() => {
    if (!currentStepData) return false;
    if (currentStepData.optional) return true;
    return !stepHasErrors(currentStep);
  }, [currentStepData, currentStep, stepHasErrors]);

  // Navigate to next step
  const next = useCallback(async (): Promise<boolean> => {
    if (isLastStep) return false;

    // Validate if required
    if (validateOnNext) {
      const isValid = await validateCurrentStep();
      if (!isValid) {
        const errors = getStepErrors(currentStep);
        onValidationFail?.(currentStepData?.id ?? '', errors);
        return false;
      }
    }

    // Mark current step as completed
    setCompletedSteps((prev) => {
      if (!prev.includes(currentStep)) {
        return [...prev, currentStep];
      }
      return prev;
    });

    // Move to next step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    onStepChange?.(nextStep, 'next');

    return true;
  }, [
    isLastStep,
    validateOnNext,
    validateCurrentStep,
    currentStep,
    currentStepData,
    getStepErrors,
    onValidationFail,
    onStepChange,
  ]);

  // Navigate to previous step
  const back = useCallback(() => {
    if (isFirstStep || !allowBack) return;

    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    onStepChange?.(prevStep, 'back');
  }, [isFirstStep, allowBack, currentStep, onStepChange]);

  // Jump to specific step
  const goToStep = useCallback(
    async (step: number): Promise<boolean> => {
      if (step < 0 || step >= totalSteps) return false;
      if (step === currentStep) return true;

      // Check if step is accessible
      if (!allowJump && step > currentStep) {
        // Can only go to completed steps or next step
        if (!completedSteps.includes(step) && step !== currentStep + 1) {
          return false;
        }
      }

      // Validate current step if moving forward
      if (step > currentStep && validateOnNext) {
        const isValid = await validateCurrentStep();
        if (!isValid) {
          const errors = getStepErrors(currentStep);
          onValidationFail?.(currentStepData?.id ?? '', errors);
          return false;
        }

        // Mark current step as completed
        setCompletedSteps((prev) => {
          if (!prev.includes(currentStep)) {
            return [...prev, currentStep];
          }
          return prev;
        });
      }

      setCurrentStep(step);
      onStepChange?.(step, 'jump');

      return true;
    },
    [
      totalSteps,
      currentStep,
      allowJump,
      completedSteps,
      validateOnNext,
      validateCurrentStep,
      currentStepData,
      getStepErrors,
      onValidationFail,
      onStepChange,
    ]
  );

  // Reset wizard
  const reset = useCallback(() => {
    setCurrentStep(initialStep);
    setCompletedSteps([]);
    form.reset();
  }, [initialStep, form]);

  // Complete wizard
  const complete = useCallback(async (): Promise<boolean> => {
    // Validate final step
    if (validateOnNext) {
      const isValid = await validateCurrentStep();
      if (!isValid) {
        const errors = getStepErrors(currentStep);
        onValidationFail?.(currentStepData?.id ?? '', errors);
        return false;
      }
    }

    // Validate entire form
    const isFormValid = await form.trigger();
    if (!isFormValid) return false;

    setIsCompleting(true);
    try {
      await onComplete?.(form.getValues());
      return true;
    } finally {
      setIsCompleting(false);
    }
  }, [
    validateOnNext,
    validateCurrentStep,
    currentStep,
    currentStepData,
    getStepErrors,
    onValidationFail,
    form,
    onComplete,
  ]);

  // Check if step is completed
  const isStepCompleted = useCallback(
    (step: number): boolean => completedSteps.includes(step),
    [completedSteps]
  );

  // Check if step is accessible
  const isStepAccessible = useCallback(
    (step: number): boolean => {
      if (allowJump) return true;
      if (step <= currentStep) return true;
      if (completedSteps.includes(step - 1)) return true;
      return false;
    },
    [allowJump, currentStep, completedSteps]
  );

  // Get step status
  const getStepStatus = useCallback(
    (step: number): 'completed' | 'current' | 'upcoming' | 'error' => {
      if (step === currentStep) return 'current';
      if (stepHasErrors(step)) return 'error';
      if (isStepCompleted(step)) return 'completed';
      return 'upcoming';
    },
    [currentStep, stepHasErrors, isStepCompleted]
  );

  return {
    // State
    currentStep,
    currentStepData,
    steps,
    visibleSteps,

    // Progress
    progress,
    completedSteps,
    isFirstStep,
    isLastStep,
    totalSteps,

    // Navigation
    next,
    back,
    goToStep,
    reset,

    // Validation
    validateCurrentStep,
    canProceed,
    stepHasErrors,
    getStepErrors,

    // Completion
    complete,
    isCompleting,

    // Helpers
    isStepCompleted,
    isStepAccessible,
    getStepStatus,
  };
}
