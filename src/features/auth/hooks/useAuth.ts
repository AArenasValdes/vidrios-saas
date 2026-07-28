"use client";

import { useEffect, useSyncExternalStore } from "react";

import { authService } from "@/features/auth/services/auth.service";
import type {
  AuthSessionChangePayload,
  AuthSignInInput,
  AuthSignInWithOAuthInput,
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
let currentAuthAbortController: AbortController | null = null;

type AuthResolveOutcome =
  | {
      kind: "resolved";
      state: AuthUserState;
    }
  | {
      kind: "timed_out";
    };

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

  if (currentAuthAbortController) {
    currentAuthAbortController.abort("__resetAuthHookTestState");
    currentAuthAbortController = null;
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

function createAuthResolveTimeout(abortSignal?: AbortSignal) {
  return new Promise<AuthResolveOutcome>((resolve) => {
    if (typeof window === "undefined") {
      resolve({
        kind: "resolved",
        state: unauthenticatedState,
      });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      resolve({
        kind: "timed_out",
      });
    }, AUTH_RESOLVE_TIMEOUT_MS);

    abortSignal?.addEventListener("abort", () => {
      window.clearTimeout(timeoutId);
      resolve({
        kind: "timed_out",
      });
    });
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
  resolveAuthStateGeneration += 1;

  if (payload.event === "SIGNED_OUT") {
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

function invalidateAuthResolution(reason: string) {
  resolveAuthStateGeneration += 1;
  authStatePromise = null;
  authStateHydratedFromNetwork = false;
  currentAuthAbortController?.abort(reason);
  currentAuthAbortController = null;
}

function refreshAuthStateInBackground() {
  invalidateAuthResolution("background-refresh");
  void resolveAuthState();
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
    currentAuthAbortController?.abort("new-resolve-auth-state");
    const abortController = new AbortController();
    currentAuthAbortController = abortController;

    authStatePromise = Promise.race([
      authService.getCurrentAuthState(options).then((state) => ({
        kind: "resolved" as const,
        state,
      })),
      createAuthResolveTimeout(abortController.signal),
    ])
      .catch(
        () =>
          ({
            kind: "timed_out",
          }) satisfies AuthResolveOutcome
      )
      .then((outcome) => {
        if (resolveAuthStateGeneration !== currentGeneration) {
          return authStateCache ?? unauthenticatedState;
        }

        if (outcome.kind === "timed_out") {
          const fallbackState = authStateCache
            ? {
                ...authStateCache,
                cargando: false,
              }
            : unauthenticatedState;

          setAuthState(fallbackState);
          return fallbackState;
        }

        const nextState = {
          ...outcome.state,
          cargando: false,
        };

        if (!nextState.user) {
          clearAuthStateStorage();
        }

        authStateHydratedFromNetwork = true;
        setAuthState(nextState);
        return nextState;
      })
      .finally(() => {
        authStatePromise = null;
        if (currentAuthAbortController === abortController) {
          currentAuthAbortController = null;
        }
      });
  }

  return authStatePromise;
}

function isPassiveAuthRoute() {
  if (typeof window === "undefined") {
    return false;
  }

  const pathname = window.location.pathname;
  return pathname === "/login" || pathname.startsWith("/auth/") || pathname === "/registro";
}

export function useAuth(options: { passive?: boolean } = {}) {
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

    if (options.passive || isPassiveAuthRoute()) {
      if (!persisted) {
        setAuthState(unauthenticatedState);
      }

      return;
    }

    const shouldDeferNetworkRefresh =
      persisted !== null && hasUsablePersistedAuthState(persisted);

    let cleanupDefer: (() => void) | undefined;

    if (shouldDeferNetworkRefresh) {
      cleanupDefer = scheduleDeferredAuthRefresh(() => {
        void resolveAuthState();
      });
    } else {
      void resolveAuthState();
    }

    return () => {
      if (cleanupDefer) {
        cleanupDefer();
      }

      currentAuthAbortController?.abort("useEffect-cleanup");
    };
  }, [options.passive]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (options.passive || isPassiveAuthRoute()) {
      return;
    }

    const scheduleRefresh = () => {
      return scheduleDeferredAuthRefresh(() => {
        refreshAuthStateInBackground();
      }, 150);
    };

    const handleFocus = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      scheduleRefresh();
    };

    const handlePageShow = () => {
      scheduleRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      scheduleRefresh();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [options.passive]);

  const signIn = async (credentials: AuthSignInInput) => {
    invalidateAuthResolution("signIn");
    const authenticatedState = await authService.signIn(credentials);
    authStateHydratedFromNetwork = true;
    setAuthState({
      ...authenticatedState,
      cargando: false,
    });
  };

  const signInWithOAuth = async (input: AuthSignInWithOAuthInput) => {
    const origin =
      input.origin ??
      (typeof window !== "undefined" ? window.location.origin : undefined);

    await authService.signInWithOAuth({
      ...input,
      origin,
    });
  };

  const signInWithGoogle = async (
    input: Omit<AuthSignInWithOAuthInput, "provider">
  ) => {
    await signInWithOAuth({ ...input, provider: "google" });
  };

  const signOut = async () => {
    invalidateAuthResolution("signOut");
    authStateHydratedFromNetwork = true;
    clearAuthStateStorage();
    setAuthState(unauthenticatedState);

    try {
      await authService.signOut();
    } catch (error) {
      authStatePromise = null;
      authStateHydratedFromNetwork = false;
      setAuthState(unauthenticatedState);
      throw error;
    }
  };

  return {
    ...authUser,
    signIn,
    signInWithOAuth,
    signInWithGoogle,
    signOut,
  };
}
