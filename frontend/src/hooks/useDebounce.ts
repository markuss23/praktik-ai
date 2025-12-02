import { useEffect, useRef } from "react";

/**
 * Custom hook for debounced values, for exapmle:
 * Delays updating a value until after a specified time has passed without changes. 
 * Useful for search inputs where you don't want to trigger API calls on every keystroke - instead, 
 * wait until the user stops typing for a moment. For example, with a 500ms delay, 
 * it only updates after the user hasn't typed for 500ms.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { useState } from "react";
