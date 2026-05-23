import type {
  AuthLoginDiagnosticEntry,
  AuthLoginDiagnosticEventType,
  AuthLoginErrorCode,
} from "@/features/auth/types/auth";

const AUTH_LOGIN_DIAGNOSTICS_STORAGE_KEY = "vidrios-saas:auth-login-diagnostics";
const AUTH_LOGIN_DIAGNOSTICS_MAX_ENTRIES = 30;

function isBrowser() {
  return typeof window !== "undefined";
}

function isStandaloneMode() {
  if (!isBrowser()) {
    return false;
  }

  const browserNavigator = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    browserNavigator.standalone === true
  );
}

function buildDiagnosticId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readEntries() {
  if (!isBrowser()) {
    return [] as AuthLoginDiagnosticEntry[];
  }

  try {
    const raw = window.localStorage.getItem(AUTH_LOGIN_DIAGNOSTICS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AuthLoginDiagnosticEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEntries(entries: AuthLoginDiagnosticEntry[]) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(
      AUTH_LOGIN_DIAGNOSTICS_STORAGE_KEY,
      JSON.stringify(entries.slice(0, AUTH_LOGIN_DIAGNOSTICS_MAX_ENTRIES))
    );
  } catch {
    return;
  }
}

function maskEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return "sin-correo";
  }

  const [localPart, domain] = normalizedEmail.split("@");
  const localPrefix = localPart.slice(0, 2);
  const maskedLocal = `${localPrefix}${"*".repeat(Math.max(localPart.length - localPrefix.length, 1))}`;

  return `${maskedLocal}@${domain}`;
}

export const authLoginDiagnosticsService = {
  record(params: {
    type: AuthLoginDiagnosticEventType;
    code?: AuthLoginErrorCode | "none";
    email: string;
    nextPath?: string | null;
    detail?: string | null;
  }) {
    const entry: AuthLoginDiagnosticEntry = {
      id: buildDiagnosticId(),
      type: params.type,
      code: params.code ?? "none",
      emailMask: maskEmail(params.email),
      pathname: isBrowser() ? window.location.pathname : "",
      nextPath: params.nextPath ?? null,
      hostname: isBrowser() ? window.location.hostname : null,
      online: typeof navigator !== "undefined" ? navigator.onLine : null,
      standalone: isStandaloneMode(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
      detail: params.detail?.trim() || null,
    };

    const entries = readEntries();
    entries.unshift(entry);
    persistEntries(entries);
    return entry;
  },
  readRecent() {
    return readEntries();
  },
  clear() {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.removeItem(AUTH_LOGIN_DIAGNOSTICS_STORAGE_KEY);
  },
};
