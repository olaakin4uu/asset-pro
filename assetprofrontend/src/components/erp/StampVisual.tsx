'use client';

import { cn } from '@/lib/utils';

export interface StampContent {
  officerName?: string;
  employeeNumber?: string;
  role?: string;
  department?: string;
  designation?: string;
  date?: string;
  time?: string;
  showSignature?: boolean;
  customTitle?: string;
  customText?: string;
  color?: string;
  style?: string; // 'rectangular' | 'circular' | 'badge'
}

interface StampVisualProps {
  stampContent: StampContent;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-3 py-2 min-w-[140px]',
  md: 'text-xs px-4 py-3 min-w-[180px]',
  lg: 'text-sm px-5 py-4 min-w-[220px]',
};

export function StampVisual({ stampContent, size = 'md', className }: StampVisualProps) {
  const {
    officerName,
    employeeNumber,
    role,
    department,
    designation,
    date,
    time,
    showSignature,
    customTitle,
    customText,
    color,
    style = 'rectangular',
  } = stampContent;

  const accentColor = color || '#1a56db';

  const lines: string[] = [];
  if (customTitle) lines.push(customTitle);
  if (officerName) lines.push(officerName);
  if (employeeNumber) lines.push(`ID: ${employeeNumber}`);
  if (role) lines.push(role);
  if (department) lines.push(department);
  if (designation) lines.push(designation);
  if (date && time) lines.push(`${date} ${time}`);
  else if (date) lines.push(date);
  else if (time) lines.push(time);
  if (customText) lines.push(customText);

  if (lines.length === 0) return null;

  const shapeClass =
    style === 'circular'
      ? 'rounded-full aspect-square flex items-center justify-center'
      : style === 'badge'
        ? 'rounded-full px-4'
        : 'rounded-md';

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center border-2 font-mono leading-tight text-center',
        shapeClass,
        SIZE_CLASSES[size],
        className,
      )}
      style={{ borderColor: accentColor, color: accentColor }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          className={cn(
            i === 0 && customTitle ? 'font-bold uppercase tracking-wider' : '',
            i === 0 && !customTitle && officerName ? 'font-semibold' : '',
          )}
        >
          {line}
        </span>
      ))}
      {showSignature && (
        <span className="mt-1 border-t pt-1 w-full text-center italic opacity-70" style={{ borderColor: accentColor }}>
          [Signed]
        </span>
      )}
    </div>
  );
}
