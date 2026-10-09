'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Sbalení se pamatuje v localStorage
const SIDEBAR_STORAGE_KEY = 'praktik-ai:admin-sidebar-collapsed';
const STEPS_CARD_STORAGE_KEY = 'praktik-ai:course-steps-collapsed';

interface AdminChromeValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  stepsCardCollapsed: boolean;
  toggleStepsCard: () => void;
  focusMode: boolean;
  toggleFocusMode: () => void;
  exitFocusMode: () => void;
}

const AdminChromeContext = createContext<AdminChromeValue | null>(null);

export function useAdminChrome(): AdminChromeValue {
  const context = useContext(AdminChromeContext);
  if (!context) {
    throw new Error('useAdminChrome must be used within an AdminChromeProvider.');
  }
  return context;
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // nastavení rozvržení, bez úložiště se jen nezapamatuje
  }
}

export function AdminChromeProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readFlag(SIDEBAR_STORAGE_KEY));
  const [stepsCardCollapsed, setStepsCardCollapsed] = useState(() => readFlag(STEPS_CARD_STORAGE_KEY));
  const [focusMode, setFocusMode] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      writeFlag(SIDEBAR_STORAGE_KEY, !prev);
      return !prev;
    });
  }, []);

  const toggleStepsCard = useCallback(() => {
    setStepsCardCollapsed((prev) => {
      writeFlag(STEPS_CARD_STORAGE_KEY, !prev);
      return !prev;
    });
  }, []);

  const exitFocusMode = useCallback(() => {
    setFocusMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const toggleFocusMode = useCallback(() => {
    if (focusMode) {
      exitFocusMode();
      return;
    }
    setFocusMode(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [focusMode, exitFocusMode]);

  // Esc ve fullscreenu ukončí fullscreen prohlížeč sám
  useEffect(() => {
    if (!focusMode) return;
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setFocusMode(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement && !e.defaultPrevented) {
        setFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [focusMode]);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      stepsCardCollapsed,
      toggleStepsCard,
      focusMode,
      toggleFocusMode,
      exitFocusMode,
    }),
    [sidebarCollapsed, toggleSidebar, stepsCardCollapsed, toggleStepsCard, focusMode, toggleFocusMode, exitFocusMode],
  );

  return <AdminChromeContext.Provider value={value}>{children}</AdminChromeContext.Provider>;
}
