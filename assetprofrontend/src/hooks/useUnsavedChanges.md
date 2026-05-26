# useUnsavedChanges Hook

A comprehensive React hook for warning users about unsaved form changes when they try to navigate away from a page.

## Features

- **Browser Navigation Protection**: Warns before page refresh/close
- **Route Change Protection**: Intercepts Next.js router navigation
- **Back/Forward Protection**: Handles browser history navigation
- **Flexible Configuration**: Customizable messages, callbacks, and behavior
- **PrimeReact Integration**: Includes dialog component using PrimeReact
- **TypeScript Support**: Full type safety with comprehensive interfaces

## Installation

The hook is already exported from `@/hooks`:

```tsx
import { useUnsavedChanges, UnsavedChangesDialog } from '@/hooks';
```

## Basic Usage

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { useUnsavedChanges, UnsavedChangesDialog } from '@/hooks';

export function MyForm() {
  const form = useForm();
  const unsaved = useUnsavedChanges({
    isDirty: form.formState.isDirty,
  });

  const onSubmit = async (data) => {
    unsaved.confirmNavigation(); // Bypass warning
    await saveData(data);
    router.push('/list');
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <UnsavedChangesDialog {...unsaved.dialogProps} />
    </form>
  );
}
```

## Configuration Options

```tsx
interface UseUnsavedChangesConfig {
  /** Whether there are unsaved changes (typically form.formState.isDirty) */
  isDirty: boolean;
  
  /** Custom warning message */
  message?: string;
  
  /** Enable browser beforeunload warning (default: true) */
  warnOnBrowserClose?: boolean;
  
  /** Enable router navigation warning (default: true) */
  warnOnRouteChange?: boolean;
  
  /** Callback when user confirms navigation */
  onConfirm?: () => void;
  
  /** Callback when user cancels navigation */
  onCancel?: () => void;
  
  /** Skip warning for certain paths */
  ignorePaths?: string[];
}
```

## Return Value

```tsx
interface UseUnsavedChangesReturn {
  // State
  isDirty: boolean;
  isBlocking: boolean;
  showDialog: boolean;
  pendingPath: string | null;

  // Actions
  setDirty: (dirty: boolean) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  allowNavigation: () => void;

  // Dialog helpers
  dialogProps: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    message: string;
  };

  // Simplified API (backward compatibility)
  hasUnsavedChanges: boolean;
  warningMessage: string;
  reset: () => void;
}
```

## Advanced Examples

### Custom Message

```tsx
const unsaved = useUnsavedChanges({
  isDirty: form.formState.isDirty,
  message: 'Your employee form has unsaved changes. Discard changes?',
});
```

### With Callbacks

```tsx
const unsaved = useUnsavedChanges({
  isDirty: form.formState.isDirty,
  onConfirm: () => console.log('Navigation confirmed'),
  onCancel: () => console.log('Navigation cancelled'),
});
```

### Ignore Specific Paths

```tsx
const unsaved = useUnsavedChanges({
  isDirty: form.formState.isDirty,
  ignorePaths: ['/help', '/support'],
});
```

### Disable Warnings Conditionally

```tsx
const [autoSave, setAutoSave] = useState(false);

const unsaved = useUnsavedChanges({
  isDirty: form.formState.isDirty,
  warnOnBrowserClose: !autoSave,
  warnOnRouteChange: !autoSave,
});
```

### Manual Control

```tsx
const unsaved = useUnsavedChanges({
  isDirty: form.formState.isDirty,
});

const handleCancel = () => {
  unsaved.reset();
  form.reset();
  router.push('/list');
};
```

## Dialog Component

The `UnsavedChangesDialog` component uses PrimeReact and can be customized:

```tsx
<UnsavedChangesDialog
  open={unsaved.showDialog}
  onConfirm={unsaved.confirmNavigation}
  onCancel={unsaved.cancelNavigation}
  message="Custom message"
  title="Custom Title"
  confirmText="Leave"
  cancelText="Stay"
/>
```

Or simply use the convenience props:

```tsx
<UnsavedChangesDialog {...unsaved.dialogProps} />
```

## How It Works

1. **Browser Events**: Listens to `beforeunload` event to warn before page refresh/close
2. **Router Interception**: Overrides Next.js router.push to show dialog before navigation
3. **History Management**: Handles browser back/forward buttons with popstate events
4. **State Management**: Tracks dirty state, pending navigation, and dialog visibility

## Notes

- The hook uses Next.js App Router APIs (`useRouter`, `usePathname`)
- Requires PrimeReact for the dialog component
- Uses `'use client'` directive for client-side functionality
- Fully type-safe with TypeScript

## Files

- `src/hooks/useUnsavedChanges.tsx` - Hook and dialog implementation
- `src/hooks/useUnsavedChanges.example.tsx` - Usage examples
- `src/hooks/useUnsavedChanges.md` - This documentation
