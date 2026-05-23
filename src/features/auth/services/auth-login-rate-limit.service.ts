const AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY = "vidrios-saas:auth-login-rate-limit-until";
const DEFAULT_AUTH_LOGIN_RATE_LIMIT_MS = 60_000;
const RATE_LIMIT_RETRY_WINDOW_MS = 90_000;

type AuthLoginRateLimitState = {
  blockedUntil: number | null;
  recent429Count: number;
  last429At: number | null;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function buildEmptyState(): AuthLoginRateLimitState {
  return {
    blockedUntil: null,
    recent429Count: 0,
    last429At: null,
  };
}

function normalizeState(
  state: Partial<AuthLoginRateLimitState> | null | undefined,
  now = Date.now()
): AuthLoginRateLimitState {
  const blockedUntil =
    typeof state?.blockedUntil === "number" && state.blockedUntil > now
      ? state.blockedUntil
      : null;
  const last429At =
    typeof state?.last429At === "number" && state.last429At > 0
      ? state.last429At
      : null;
  const withinWindow =
    last429At !== null && now - last429At <= RATE_LIMIT_RETRY_WINDOW_MS;

  return {
    blockedUntil,
    recent429Count:
      withinWindow && typeof state?.recent429Count === "number"
        ? Math.max(Math.floor(state.recent429Count), 0)
        : 0,
    last429At: withinWindow ? last429At : null,
  };
}

function readPersistedState(now = Date.now()) {
  if (!isBrowser()) {
    return buildEmptyState();
  }

  try {
    const raw = window.localStorage.getItem(AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY);

    if (!raw) {
      return buildEmptyState();
    }

    const parsed = JSON.parse(raw) as Partial<AuthLoginRateLimitState>;
    const normalized = normalizeState(parsed, now);

    if (
      normalized.blockedUntil === null &&
      normalized.recent429Count === 0 &&
      normalized.last429At === null
    ) {
      window.localStorage.removeItem(AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY);
    }

    return normalized;
  } catch {
    return buildEmptyState();
  }
}

function persistState(state: AuthLoginRateLimitState) {
  if (!isBrowser()) {
    return;
  }

  if (
    state.blockedUntil === null &&
    state.recent429Count === 0 &&
    state.last429At === null
  ) {
    window.localStorage.removeItem(AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY,
    JSON.stringify(state)
  );
}

export const authLoginRateLimitService = {
  getDefaultDurationMs() {
    return DEFAULT_AUTH_LOGIN_RATE_LIMIT_MS;
  },
  getRetryWindowMs() {
    return RATE_LIMIT_RETRY_WINDOW_MS;
  },
  readState(now = Date.now()) {
    return readPersistedState(now);
  },
  readUntil() {
    return this.readState().blockedUntil;
  },
  getRemainingMs(now = Date.now()) {
    const until = this.readUntil();
    return until ? Math.max(until - now, 0) : 0;
  },
  registerRateLimitedResponse(
    durationMs = DEFAULT_AUTH_LOGIN_RATE_LIMIT_MS,
    now = Date.now()
  ) {
    if (!isBrowser()) {
      return buildEmptyState();
    }

    const currentState = this.readState(now);
    const nextCount =
      currentState.last429At !== null &&
      now - currentState.last429At <= RATE_LIMIT_RETRY_WINDOW_MS
        ? currentState.recent429Count + 1
        : 1;
    const nextState: AuthLoginRateLimitState = {
      blockedUntil:
        nextCount >= 2 ? now + Math.max(durationMs, 1_000) : null,
      recent429Count: nextCount,
      last429At: now,
    };

    try {
      persistState(nextState);
    } catch {
      return nextState;
    }

    return nextState;
  },
  clear() {
    if (!isBrowser()) {
      return;
    }

    try {
      persistState(buildEmptyState());
    } catch {
      return;
    }
  },
};
