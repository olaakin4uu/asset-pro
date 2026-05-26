'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SettingToggleProps {
  /** Override auto-generated ID */
  id?: string;
  /** Toggle label */
  label: string;
  /** Description text shown below the label */
  description: string;
  /** Current toggle value */
  value: boolean;
  /** Called when the toggle changes */
  onChange: (value: boolean) => void;
  /** Disable the toggle */
  disabled?: boolean;
}

export function SettingToggle({
  id: externalId,
  label,
  description,
  value,
  onChange,
  disabled,
}: SettingToggleProps) {
  const autoId = useId();
  const id = externalId ?? autoId;
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;

  return (
    <div className="flex items-center justify-between">
      <div>
        <label id={labelId} className="text-sm font-medium">
          {label}
        </label>
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby={labelId}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          value ? 'bg-primary' : 'bg-gray-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            value ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
