'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface ApprovalCelebrationProps {
  message: string;
  onClose: () => void;
  title?: string;
  duration?: number;
}

export function ApprovalCelebration({ message, onClose, title = 'Approved Successfully!', duration = 4000 }: ApprovalCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 animate-in fade-in duration-300 pointer-events-auto" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-green-200 dark:border-green-800 px-10 py-8 animate-in zoom-in-95 fade-in duration-300 pointer-events-auto max-w-md mx-4">
        {/* Clapping hands */}
        <div className="flex justify-center mb-4">
          <span className="text-5xl animate-bounce" style={{ animationDuration: '0.6s' }}>👏</span>
          <span className="text-5xl animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.15s' }}>👏</span>
          <span className="text-5xl animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.3s' }}>👏</span>
        </div>

        {/* Success icon */}
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Message */}
        <h3 className="text-lg font-bold text-center text-green-800 dark:text-green-200">
          {title}
        </h3>
        <p className="text-sm text-center text-muted-foreground mt-1">{message}</p>

        {/* Sparkle particles */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-xl animate-ping"
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${5 + Math.random() * 90}%`,
                animationDuration: `${1 + Math.random()}s`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            >
              ✨
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
