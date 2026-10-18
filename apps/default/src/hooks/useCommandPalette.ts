/**
 * useCommandPalette
 * ─────────────────────────────────────────────────────────────────────────────
 * Global open/close state for the command palette.
 * Registers ⌘K / Ctrl+K to open, plus secondary shortcuts.
 */

import { useEffect } from 'react';
import { create } from 'zustand';

interface CommandPaletteStore {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
  open: false,
  openPalette:  () => set({ open: true  }),
  closePalette: () => set({ open: false }),
  togglePalette: () => set((s) => ({ open: !s.open })),
}));

/**
 * Mount this once at the root level.
 * Registers the global ⌘K / Ctrl+K handler.
 * Returns the store so callers can also read open state.
 */
export function useCommandPaletteKeyBinding() {
  const { togglePalette, closePalette } = useCommandPaletteStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K / Ctrl+K — toggle palette
      if (meta && e.key === 'k') {
        e.preventDefault();
        togglePalette();
        return;
      }

      // Escape — close palette (handled inside the component too, belt-and-suspenders)
      if (e.key === 'Escape') {
        closePalette();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePalette, closePalette]);

  return useCommandPaletteStore;
}
