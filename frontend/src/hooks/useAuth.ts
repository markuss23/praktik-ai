"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  buildLoginUrl,
  buildLogoutUrl,
  clearTokens,
  getStoredTokens,
  isTokenExpiring,
  parseJwt,
  refreshTokens,
  storeTokens,
  type UserInfo,
} from "@/lib/keycloak";

export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  accessToken: string | null;
  loading: boolean;
}

const LOGGED_OUT: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  loading: false,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    loading: true,
  });

  // Keep a ref so callbacks can always read the latest accessToken
  // without causing stale-closure issues in timers.
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = state.accessToken;

  // Shared refresh logic — updates state when new tokens arrive
  const applyRefresh = useCallback(async (): Promise<boolean> => {
    const tokens = getStoredTokens();
    if (!tokens) return false;
    try {
      const fresh = await refreshTokens(tokens.refreshToken);
      storeTokens(fresh);
      const freshUser = parseJwt(fresh.access_token);
      setState({
        isAuthenticated: true,
        user: freshUser,
        accessToken: fresh.access_token,
        loading: false,
      });
      return true;
    } catch {
      clearTokens(); // also dispatches "kc:logout"
      setState(LOGGED_OUT);
      return false;
    }
  }, []);

  // 1. Initialise from localStorage on first render
  useEffect(() => {
    const tokens = getStoredTokens();
    if (!tokens) {
      setState(LOGGED_OUT);
      return;
    }

    const user = parseJwt(tokens.accessToken);
    if (user && !isTokenExpiring(0)) {
      // Access token is still valid
      setState({ isAuthenticated: true, user, accessToken: tokens.accessToken, loading: false });
    } else {
      // Expired or missing — try silent refresh immediately
      applyRefresh();
    }
  }, [applyRefresh]);

  // 2. Proactive refresh timer — fires 60 s before the access token expires.
  useEffect(() => {
    if (!state.isAuthenticated || !state.accessToken) return;

    const tokens = getStoredTokens();
    if (!tokens) return;

    // Schedule refresh 60 s before expiry (minimum 5 s to avoid instant loop)
    const delay = Math.max(5_000, tokens.expiresAt - Date.now() - 60_000);

    const timer = setTimeout(() => {
      applyRefresh();
    }, delay);

    return () => clearTimeout(timer);
  }, [state.accessToken, state.isAuthenticated, applyRefresh]);

  // 3. Refresh when the browser tab becomes visible again
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible" && isTokenExpiring()) {
        applyRefresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [state.isAuthenticated, applyRefresh]);

  // 4. Listen for forced logout from outside React
  useEffect(() => {
    const onForced = () => setState(LOGGED_OUT);
    window.addEventListener("kc:logout", onForced);
    return () => window.removeEventListener("kc:logout", onForced);
  }, []);

  // Public API
  const login = useCallback(async () => {
    const url = await buildLoginUrl();
    window.location.href = url;
  }, []);

  const logout = useCallback(() => {
    const logoutUrl = buildLogoutUrl(window.location.origin);
    clearTokens();
    setState(LOGGED_OUT);
    window.location.href = logoutUrl;
  }, []);

  return { ...state, login, logout };
}
