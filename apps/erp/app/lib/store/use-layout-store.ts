/**
 * Layout UI store — controls sidebar collapsed and mobile-open state.
 * Per AGENTS.md: Zustand is ONLY for UI state (modals, toggles, sidebar).
 */
import { create } from "zustand";

interface LayoutState {
  /** Desktop: sidebar is icon-only collapsed */
  isCollapsed: boolean;
  /** Mobile: sidebar overlay is visible */
  isMobileSidebarOpen: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isCollapsed: false,
  isMobileSidebarOpen: false,
  toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setCollapsed: (v) => set({ isCollapsed: v }),
  toggleMobileSidebar: () =>
    set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
}));
