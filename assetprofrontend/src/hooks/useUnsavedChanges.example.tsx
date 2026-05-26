// @ts-nocheck
/**
 * Example usage of useUnsavedChanges hook
 *
 * This file demonstrates how to use the useUnsavedChanges hook
 * to warn users about unsaved form changes.
 */

'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useUnsavedChanges, UnsavedChangesDialog } from '@/hooks';

// Example 1: Basic usage with React Hook Form
export function BasicFormExample() {
  const router = useRouter();
  const form = useForm<{ name: string; email: string }>();

  // Hook automatically tracks form dirty state
  const unsaved = useUnsavedChanges({
    isDirty: form.formState.isDirty,
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    // Bypass warning when submitting
    unsaved.confirmNavigation();
    await saveData(data);
    router.push('/list');
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      <input {...form.register('email')} />
      <button type="submit">Save</button>
      
      {/* Dialog shows automatically when navigating with unsaved changes */}
      <UnsavedChangesDialog {...unsaved.dialogProps} />
    </form>
  );
}

// Example 2: Custom message
export function CustomMessageExample() {
  const form = useForm();
  
  const unsaved = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    message: 'Your employee form has unsaved changes. Discard changes?',
  });

  return (
    <div>
      {/* Form content */}
      <UnsavedChangesDialog {...unsaved.dialogProps} />
    </div>
  );
}

// Example 3: With callbacks
export function WithCallbacksExample() {
  const form = useForm();
  
  const unsaved = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onConfirm: () => console.log('User confirmed navigation'),
    onCancel: () => console.log('User cancelled navigation'),
  });

  return (
    <div>
      {/* Form content */}
      <UnsavedChangesDialog {...unsaved.dialogProps} />
    </div>
  );
}

// Example 4: Disable warnings conditionally
export function ConditionalWarningExample() {
  const form = useForm();
  const [isAutoSaving, setIsAutoSaving] = useUnsavedChanges(false);
  
  const unsaved = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    // Disable warning when auto-saving is enabled
    warnOnBrowserClose: !isAutoSaving,
    warnOnRouteChange: !isAutoSaving,
  });

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={isAutoSaving}
          onChange={(e) => setIsAutoSaving(e.target.checked)}
        />
        Enable auto-save
      </label>
      
      <UnsavedChangesDialog {...unsaved.dialogProps} />
    </div>
  );
}

// Example 5: Ignore certain paths
export function IgnorePathsExample() {
  const form = useForm();
  
  const unsaved = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    // Don't warn when navigating to these paths
    ignorePaths: ['/help', '/support'],
  });

  return (
    <div>
      {/* Form content */}
      <UnsavedChangesDialog {...unsaved.dialogProps} />
    </div>
  );
}

// Example 6: Manual control
export function ManualControlExample() {
  const form = useForm();
  
  const unsaved = useUnsavedChanges({
    isDirty: form.formState.isDirty,
  });

  const handleCancel = () => {
    // Manually reset unsaved state
    unsaved.reset();
    form.reset();
    router.push('/list');
  };

  return (
    <div>
      <button onClick={handleCancel}>Cancel</button>
      <UnsavedChangesDialog {...unsaved.dialogProps} />
    </div>
  );
}

// Helper function (mock)
async function saveData(data: Record<string, unknown>) {
  // API call
}
