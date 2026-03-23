"use client";

import { useEffect, useSyncExternalStore } from "react";

import { authService } from "@/services/auth.service";
import type { AuthSignInInput, AuthUserState } from "@/types/auth";

const emptyAuthUser: AuthUserState = {
  user: null,
  organizacionId: null,
  rol: null,
  cargando: true,
};

const unauthenticatedState: AuthUserState = {
  user: null,
  organizacionId: null,
  rol: null,
  cargando: false,
};

const AUTH_STORAGE_KEY = "vidrios-saas:auth-state";

let authStateCache: AuthUserState | null = null;
let authStatePromise: Promise<AuthUserState> | null = null;
let authSubscriptionCleanup: (() => void) | null = null;
let authStateHydratedFromNetwork = false;
const authStoreListeners = new Set<() => void>();

export function __resetAuthHookTestState() {
  authStateCache = null;
  authStatePromise = null;
  authStateHydratedFromNetwork = false;

  if (authSubscriptionCleanup) {
    authSubscriptionCleanup();
    authSubscriptionCleanup = null;
  }

  authStoreListeners.clear();

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function emitAuthStoreChange() {
  authStoreListeners.forEach((listener) => listener());
}

function readAuthStateFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthUserState;
  } catch {
    return null;
  }
}

function hasUsablePersistedAuthState(state: AuthUserState | null) {
  return Boolean(state?.user && state.organizacionId);
}

function persistAuthState(nextState: AuthUserState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    return;
  }
}

function clearAuthStateStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    return;
  }
}

function setAuthState(nextState: AuthUserState) {
  authStateCache = nextState;
  persistAuthState(nextState);
  emitAuthStoreChange();
}

function getAuthSnapshot() {
  if (authStateCache) {
    return authStateCache;
  }

  const persisted = readAuthStateFromStorage();

  if (persisted) {
    authStateCache = persisted;
    return persisted;
  }

  return emptyAuthUser;
}

function getServerAuthSnapshot() {
  return emptyAuthUser;
}

function ensureAuthSubscription() {
  if (authSubscriptionCleanup) {
    return;
  }

  authSubscriptionCleanup = authService.subscribeToAuthChanges(() => {
    authStateCache = null;
    authStateHydratedFromNetwork = false;
    void resolveAuthState();
  });
}

function subscribeToAuthStore(listener: () => void) {
  authStoreListeners.add(listener);
  ensureAuthSubscription();

  return () => {
    authStoreListeners.delete(listener);

    if (authStoreListeners.size === 0 && authSubscriptionCleanup) {
      authSubscriptionCleanup();
      authSubscriptionCleanup = null;
    }
  };
}

async function resolveAuthState() {
  if (authStateHydratedFromNetwork && authStateCache && !authStateCache.cargando) {
    return authStateCache;
  }

  if (!authStatePromise) {
    authStatePromise = authService
      .getCurrentAuthState()
      .then((currentAuth) => ({
        ...currentAuth,
        cargando: false,
      }))
      .catch(() => unauthenticatedState)
      .then((nextState) => {
        authStateHydratedFromNetwork = true;
        setAuthState(nextState);
        return nextState;
      })
      .finally(() => {
        authStatePromise = null;
      });
  }

  return authStatePromise;
}

export function useAuth() {
  const authUser = useSyncExternalStore(
    subscribeToAuthStore,
    getAuthSnapshot,
    getServerAuthSnapshot
  );

  useEffect(() => {
    ensureAuthSubscription();

    const persisted = readAuthStateFromStorage();

    if (persisted && !authStateHydratedFromNetwork && !hasUsablePersistedAuthState(persisted)) {
      setAuthState({
        ...persisted,
        cargando: true,
      });
    }

    void resolveAuthState();
  }, []);

  const signIn = async (credentials: AuthSignInInput) => {
    await authService.signIn(credentials);
    authStateCache = null;
    setAuthState({
      ...emptyAuthUser,
    });
    await resolveAuthState();
  };

  const signOut = async () => {
    authStatePromise = null;
    authStateHydratedFromNetwork = true;
    clearAuthStateStorage();
    setAuthState(unauthenticatedState);
    await authService.signOut();
  };

  return {
    ...authUser,
    signIn,
    signOut,
  };
}
