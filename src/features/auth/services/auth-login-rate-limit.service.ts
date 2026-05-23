const AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY = "vidrios-saas:auth-login-rate-limit-until";
const DEFAULT_AUTH_LOGIN_RATE_LIMIT_MS = 60_000;

function isBrowser() {
  return typeof window !== "undefined";
}

function parseTimestamp(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export const authLoginRateLimitService = {
  getDefaultDurationMs() {
    return DEFAULT_AUTH_LOGIN_RATE_LIMIT_MS;
  },
  readUntil() {
    if (!isBrowser()) {
      return null;
    }

    try {
      const stored = parseTimestamp(
        window.localStorage.getItem(AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY)
      );

      if (!stored) {
        return null;
      }

      if (stored <= Date.now()) {
        window.localStorage.removeItem(AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY);
        return null;
      }

      return stored;
    } catch {
      return null;
    }
  },
  getRemainingMs(now = Date.now()) {
    const until = this.readUntil();
    return until ? Math.max(until - now, 0) : 0;
  },
  activate(durationMs = DEFAULT_AUTH_LOGIN_RATE_LIMIT_MS) {
    if (!isBrowser()) {
      return null;
    }

    const until = Date.now() + Math.max(durationMs, 1_000);

    try {
      window.localStorage.setItem(
        AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY,
        String(until)
      );
    } catch {
      return until;
    }

    return until;
  },
  clear() {
    if (!isBrowser()) {
      return;
    }

    try {
      window.localStorage.removeItem(AUTH_LOGIN_RATE_LIMIT_STORAGE_KEY);
    } catch {
      return;
    }
  },
};
