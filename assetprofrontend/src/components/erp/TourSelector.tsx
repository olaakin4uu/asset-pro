'use client';

import { CheckCircle, Play, RotateCcw } from 'lucide-react';
import type { TourId } from '@/stores/tour';

export interface TourSelectorProps {
  tours: Array<{
    id: TourId;
    name: string;
    description: string;
    completed: boolean;
  }>;
  onStartTour: (tourId: TourId) => void;
  onResetAll: () => void;
  onClose: () => void;
}

export function TourSelector({ tours, onStartTour, onResetAll, onClose }: TourSelectorProps) {
  const completedCount = tours.filter((t) => t.completed).length;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
      <div className="border-b border-border p-3">
        <h3 className="font-semibold text-foreground">Guided Tours</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {completedCount} of {tours.length} completed
        </p>
      </div>
      <div className="p-2">
        {tours.map((tour) => (
          <button
            key={tour.id}
            onClick={() => {
              onClose();
              onStartTour(tour.id);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
          >
            <div className="flex-shrink-0">
              {tour.completed ? (
                <CheckCircle className="h-4.5 w-4.5 text-green-500" />
              ) : (
                <Play className="h-4.5 w-4.5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{tour.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {tour.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      {completedCount > 0 && (
        <div className="border-t border-border p-2">
          <button
            onClick={() => {
              onResetAll();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All Tours
          </button>
        </div>
      )}
    </div>
  );
}
