"use client";

import { useCallback, useSyncExternalStore } from "react";

// Shoda s CSS media query; null = vždy false. Na serveru false, po hydrataci skutečná hodnota.
export function useMediaQuery(query: string | null): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!query) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (query ? window.matchMedia(query).matches : false),
    () => false,
  );
}
