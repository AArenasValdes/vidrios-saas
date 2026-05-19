"use client";

import { useEffect, useSyncExternalStore } from "react";

import { authService } from "@/features/auth/services/auth.service";
import type {
  AuthSessionChangePayload,
  AuthSignInInput,
  AuthUserState,
} from "@/features/auth/types/auth";

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
const AUTH_RESOLVE_TIMEOUT_MS = 8000;

let authStateCache: AuthUserState | null = null;
let authStatePromise: Promise<AuthUserState> | null = null;
let authSubscriptionCleanup: (() => void) | null = null;
let authStateHydratedFromNetwork = false;
let resolveAuthStateGeneration = 0;
const authStoreListeners = new Set<() => void>();

type BrowserWindowWithIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export function __resetAuthHookTestState() {
  authStateCache = null;
  authStatePromise = null;
  authStateHydratedFromNetwork = false;
  resolveAuthStateGeneration = 0;

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

function scheduleDeferredAuthRefresh(callback: () => void, delayMs = 450) {
  if (typeof window === "undefined") {
    callback();
    return () => undefined;
  }

  const browserWindow = window as BrowserWindowWithIdleCallback;

  if (typeof browserWindow.requestIdleCallback === "function") {
    const handle = browserWindow.requestIdleCallback(callback, {
      timeout: Math.max(1500, delayMs),
    });

    return () => {
      browserWindow.cancelIdleCallback?.(handle);
    };
  }

  const timeoutId = window.setTimeout(callback, delayMs);
  return () => window.clearTimeout(timeoutId);
}

function createAuthResolveTimeout() {
  return new Promise<AuthUserState>((resolve) => {
    if (typeof window === "undefined") {
      resolve(unauthenticatedState);
      return;
    }

    window.setTimeout(() => {
      resolve(unauthenticatedState);
    }, AUTH_RESOLVE_TIMEOUT_MS);
  });
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

  authSubscriptionCleanup = authService.subscribeToAuthChanges((payload) => {
    handleAuthSessionChange(payload);
  });
}

function handleAuthSessionChange(payload: AuthSessionChangePayload) {
  authStatePromise = null;

  if (payload.event === "SIGNED_OUT") {
    resolveAuthStateGeneration += 1;
    authStateCache = null;
    authStateHydratedFromNetwork = true;
    clearAuthStateStorage();
    setAuthState(unauthenticatedState);
    return;
  }

  if (
    payload.event === "SIGNED_IN" ||
    payload.event === "TOKEN_REFRESHED" ||
    payload.event === "INITIAL_SESSION" ||
    payload.event === "USER_UPDATED"
  ) {
    authStateCache = null;
    authStateHydratedFromNetwork = false;
    void resolveAuthState({
      accessToken: payload.session?.access_token ?? null,
      preferServerLookup: Boolean(payload.session?.access_token),
      retryServerOnUnauthorized: payload.event === "SIGNED_IN",
    });
    return;
  }

  authStateCache = null;
  authStateHydratedFromNetwork = false;
  void resolveAuthState();
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

async function resolveAuthState(options: {
  accessToken?: string | null;
  preferServerLookup?: boolean;
  retryServerOnUnauthorized?: boolean;
} = {}) {
  const currentGeneration = resolveAuthStateGeneration;

  if (authStateHydratedFromNetwork && authStateCache && !authStateCache.cargando) {
    return authStateCache;
  }

  if (!authStatePromise) {
    authStatePromise = Promise.race([
      authService.getCurrentAuthState(options),
      createAuthResolveTimeout(),
    ])
      .then((currentAuth) => ({
        ...currentAuth,
        cargando: false,
      }))
      .catch(() => unauthenticatedState)
      .then((nextState) => {
        if (resolveAuthStateGeneration !== currentGeneration) {
          return unauthenticatedState;
        }

        if (!nextState.user) {
          clearAuthStateStorage();
          void authService.signOut().catch(() => undefined);
        }

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

    const shouldDeferNetworkRefresh =
      persisted !== null && hasUsablePersistedAuthState(persisted);

    if (shouldDeferNetworkRefresh) {
      return scheduleDeferredAuthRefresh(() => {
        void resolveAuthState();
      });
    }

    void resolveAuthState();
  }, []);

  const signIn = async (credentials: AuthSignInInput) => {
    const authenticatedState = await authService.signIn(credentials);
    authStatePromise = null;
    authStateHydratedFromNetwork = true;
    setAuthState({
      ...authenticatedState,
      cargando: false,
    });
  };

  const signOut = async () => {
    const previousState = getAuthSnapshot();

    resolveAuthStateGeneration += 1;
    authStatePromise = null;
    authStateHydratedFromNetwork = true;
    clearAuthStateStorage();
    setAuthState(unauthenticatedState);

    try {
      await authService.signOut();
    } catch (error) {
      authStatePromise = null;
      authStateHydratedFromNetwork =
        Boolean(previousState.user) && !previousState.cargando;
      setAuthState(previousState);
      throw error;
    }
  };

  return {
    ...authUser,
    signIn,
    signOut,
  };
}
