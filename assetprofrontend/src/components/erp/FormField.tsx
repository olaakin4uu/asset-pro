'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  /** Unique ID for the field — used for htmlFor, aria-describedby, etc. */
  id: string;
  /** Label text */
  label: string;
  /** Show required indicator */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Help text shown below the input */
  description?: string;
  /** Render prop that receives ARIA props to spread onto the input */
  children: (props: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-required'?: boolean;
  }) => React.ReactNode;
  /** Container className */
  className?: string;
}

export function FormField({
  id,
  label,
  required,
  error,
  description,
  children,
  className,
}: FormFieldProps) {
  const describedByParts: string[] = [];
  if (error) describedByParts.push(`${id}-error`);
  if (description) describedByParts.push(`${id}-description`);

  const childProps = {
    id,
    ...(error ? { 'aria-invalid': true as const } : {}),
    ...(describedByParts.length > 0
      ? { 'aria-describedby': describedByParts.join(' ') }
      : {}),
    ...(required ? { 'aria-required': true as const } : {}),
  };

  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children(childProps)}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {description && !error && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
