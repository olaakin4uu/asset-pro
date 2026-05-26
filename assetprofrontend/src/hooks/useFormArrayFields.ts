'use client';

import { useCallback, useMemo } from 'react';
import {
  useFieldArray,
  type UseFormReturn,
  type FieldValues,
  type ArrayPath,
  type FieldArray,
  type FieldArrayPath,
  type UseFieldArrayReturn,
} from 'react-hook-form';

// ============================================================================
// TYPES
// ============================================================================

export interface UseFormArrayFieldsConfig<
  T extends FieldValues = FieldValues,
  TName extends FieldArrayPath<T> = FieldArrayPath<T>
> {
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Field array name */
  name: TName;
  /** Default value for new items */
  defaultItem: FieldArray<T, TName>;
  /** Minimum number of items */
  minItems?: number;
  /** Maximum number of items */
  maxItems?: number;
  /** Key field for tracking (default: auto-generated) */
  keyName?: string;
  /** Callback when item is added */
  onAdd?: (item: FieldArray<T, TName>, index: number) => void;
  /** Callback when item is removed */
  onRemove?: (index: number) => void;
  /** Callback when items are reordered */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export interface UseFormArrayFieldsReturn<
  T extends FieldValues = FieldValues,
  TName extends FieldArrayPath<T> = FieldArrayPath<T>
> {
  // Field array from react-hook-form
  fields: UseFieldArrayReturn<T, TName>['fields'];

  // Item management
  append: (item?: Partial<FieldArray<T, TName>>) => void;
  prepend: (item?: Partial<FieldArray<T, TName>>) => void;
  insert: (index: number, item?: Partial<FieldArray<T, TName>>) => void;
  remove: (index: number) => void;
  removeAll: () => void;
  update: (index: number, item: Partial<FieldArray<T, TName>>) => void;
  replace: (items: FieldArray<T, TName>[]) => void;

  // Reordering
  move: (fromIndex: number, toIndex: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  swap: (indexA: number, indexB: number) => void;

  // Duplicate
  duplicate: (index: number) => void;

  // State
  count: number;
  isEmpty: boolean;
  canAdd: boolean;
  canRemove: boolean;
  canMoveUp: (index: number) => boolean;
  canMoveDown: (index: number) => boolean;

  // Helpers
  getFieldName: (index: number, field: string) => string;
  getFieldError: (index: number, field: string) => string | undefined;
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormArrayFields<
  T extends FieldValues = FieldValues,
  TName extends FieldArrayPath<T> = FieldArrayPath<T>
>(config: UseFormArrayFieldsConfig<T, TName>): UseFormArrayFieldsReturn<T, TName> {
  const {
    form,
    name,
    defaultItem,
    minItems = 0,
    maxItems,
    onAdd,
    onRemove,
    onReorder,
  } = config;

  // Use react-hook-form's useFieldArray
  const fieldArray = useFieldArray<T, TName>({
    control: form.control,
    name,
  });

  const { fields } = fieldArray;

  // Count and state
  const count = fields.length;
  const isEmpty = count === 0;
  const canAdd = maxItems === undefined || count < maxItems;
  const canRemove = count > minItems;

  // Append item
  const append = useCallback(
    (item?: Partial<FieldArray<T, TName>>) => {
      if (!canAdd) return;

      const newItem = { ...(defaultItem as object), ...(item as object) } as FieldArray<T, TName>;
      fieldArray.append(newItem);
      onAdd?.(newItem, count);
    },
    [canAdd, defaultItem, fieldArray, count, onAdd]
  );

  // Prepend item
  const prepend = useCallback(
    (item?: Partial<FieldArray<T, TName>>) => {
      if (!canAdd) return;

      const newItem = { ...(defaultItem as object), ...(item as object) } as FieldArray<T, TName>;
      fieldArray.prepend(newItem);
      onAdd?.(newItem, 0);
    },
    [canAdd, defaultItem, fieldArray, onAdd]
  );

  // Insert item at index
  const insert = useCallback(
    (index: number, item?: Partial<FieldArray<T, TName>>) => {
      if (!canAdd) return;

      const newItem = { ...(defaultItem as object), ...(item as object) } as FieldArray<T, TName>;
      fieldArray.insert(index, newItem);
      onAdd?.(newItem, index);
    },
    [canAdd, defaultItem, fieldArray, onAdd]
  );

  // Remove item
  const remove = useCallback(
    (index: number) => {
      if (!canRemove) return;

      fieldArray.remove(index);
      onRemove?.(index);
    },
    [canRemove, fieldArray, onRemove]
  );

  // Remove all items
  const removeAll = useCallback(() => {
    // Keep minimum items
    if (minItems > 0) {
      const itemsToKeep = Array(minItems)
        .fill(null)
        .map(() => defaultItem);
      fieldArray.replace(itemsToKeep);
    } else {
      fieldArray.remove();
    }
  }, [minItems, defaultItem, fieldArray]);

  // Update item
  const update = useCallback(
    (index: number, item: Partial<FieldArray<T, TName>>) => {
      const currentItem = fields[index];
      if (!currentItem) return;

      fieldArray.update(index, { ...currentItem, ...item } as FieldArray<T, TName>);
    },
    [fields, fieldArray]
  );

  // Replace all items
  const replace = useCallback(
    (items: FieldArray<T, TName>[]) => {
      fieldArray.replace(items);
    },
    [fieldArray]
  );

  // Move item
  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= count) return;
      if (toIndex < 0 || toIndex >= count) return;

      fieldArray.move(fromIndex, toIndex);
      onReorder?.(fromIndex, toIndex);
    },
    [count, fieldArray, onReorder]
  );

  // Move item up
  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      move(index, index - 1);
    },
    [move]
  );

  // Move item down
  const moveDown = useCallback(
    (index: number) => {
      if (index >= count - 1) return;
      move(index, index + 1);
    },
    [move, count]
  );

  // Swap items
  const swap = useCallback(
    (indexA: number, indexB: number) => {
      if (indexA === indexB) return;
      if (indexA < 0 || indexA >= count) return;
      if (indexB < 0 || indexB >= count) return;

      fieldArray.swap(indexA, indexB);
      onReorder?.(indexA, indexB);
    },
    [count, fieldArray, onReorder]
  );

  // Duplicate item
  const duplicate = useCallback(
    (index: number) => {
      if (!canAdd) return;
      if (index < 0 || index >= count) return;

      const itemToDuplicate = fields[index];
      if (!itemToDuplicate) return;

      // Remove the id field to create a new item
      const { id, ...itemWithoutId } = itemToDuplicate as Record<string, unknown>;
      const newItem = { ...itemWithoutId } as FieldArray<T, TName>;

      fieldArray.insert(index + 1, newItem);
      onAdd?.(newItem, index + 1);
    },
    [canAdd, count, fields, fieldArray, onAdd]
  );

  // Check if can move up
  const canMoveUp = useCallback(
    (index: number): boolean => index > 0,
    []
  );

  // Check if can move down
  const canMoveDown = useCallback(
    (index: number): boolean => index < count - 1,
    [count]
  );

  // Get field name for nested field
  const getFieldName = useCallback(
    (index: number, field: string): string => {
      return `${name}.${index}.${field}` as string;
    },
    [name]
  );

  // Get field error
  const getFieldError = useCallback(
    (index: number, field: string): string | undefined => {
      const errors = form.formState.errors;
      const arrayErrors = errors[name as keyof typeof errors] as
        | Record<number, Record<string, { message?: string }>>
        | undefined;

      return arrayErrors?.[index]?.[field]?.message;
    },
    [form.formState.errors, name]
  );

  return {
    // Field array
    fields,

    // Item management
    append,
    prepend,
    insert,
    remove,
    removeAll,
    update,
    replace,

    // Reordering
    move,
    moveUp,
    moveDown,
    swap,

    // Duplicate
    duplicate,

    // State
    count,
    isEmpty,
    canAdd,
    canRemove,
    canMoveUp,
    canMoveDown,

    // Helpers
    getFieldName,
    getFieldError,
  };
}
