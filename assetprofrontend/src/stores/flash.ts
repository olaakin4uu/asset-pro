'use client';

import { create } from 'zustand';

export type FlashType = 'success' | 'error' | 'info' | 'warning';

interface FlashState {
  message: string | null;
  type: FlashType;
  setFlash: (message: string, type?: FlashType) => void;
  clearFlash: () => void;
}

export const useFlashStore = create<FlashState>((set) => ({
  message: null,
  type: 'success',
  setFlash: (message, type = 'success') => set({ message, type }),
  clearFlash: () => set({ message: null }),
}));
