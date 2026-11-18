'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserResponse } from '@/api';
import { getMe } from '@/lib/api-client';
import { useAuth } from './useAuth';

interface UseCurrentUserResult {
  currentUser: UserResponse | null;
  loading: boolean;
  /** Check if the current user is the owner of a resource with given ownerId */
  isOwner: (ownerId: number) => boolean;
  /** Refetch current user data from the API */
  refetch: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const me = await getMe();
      setCurrentUser(me);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  }, []);

  useEffect(() => {
    // Auth se ještě inicializuje (token z úložiště / refresh) — dřív by se tu
    // `loading` nastavilo na false bez uživatele a volající by to vzali jako
    // „nepřihlášen / nevlastník".
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    async function load() {
      try {
        const me = await getMe();
        if (!cancelled) setCurrentUser(me);
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading]);

  const isOwner = (ownerId: number) => {
    return currentUser?.userId === ownerId;
  };

  return { currentUser, loading, isOwner, refetch: fetchUser };
}
