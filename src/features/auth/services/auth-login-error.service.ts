import type { AuthLoginErrorCode } from "@/features/auth/types/auth";

export const AUTH_LOGIN_TIMEOUT_SENTINEL = "LOGIN_TIMEOUT";
export const AUTH_COOKIE_NOT_READY_SENTINEL = "AUTH_COOKIE_NOT_READY";
export const GET_ORG_ID_PERMISSION_ERROR_MESSAGE =
  "Tu acceso esta bien, pero hubo un problema interno al abrir tu espacio. Intenta de nuevo en unos segundos.";

const AUTH_LOGIN_ERROR_COPY: Record<AuthLoginErrorCode, string> = {
  invalid_credentials: "Revisa tu correo y contrasena. Ese acceso no coincide.",
  network_unavailable:
    "No pudimos conectarnos. Revisa internet en este celular e intenta otra vez.",
  login_timeout:
    "La sesion demoro demasiado en abrirse en este dispositivo. Intenta otra vez.",
  cookie_not_ready:
    "La sesion se abrio, pero este dispositivo no la termino de guardar a tiempo. Intenta otra vez.",
  profile_missing:
    "Este usuario no quedo vinculado a una empresa. Entra con un usuario valido o revisa su vinculacion.",
  profile_bootstrap_failed:
    "Tu acceso se valido, pero no pudimos cargar tu espacio comercial en este intento.",
  org_permission_error: GET_ORG_ID_PERMISSION_ERROR_MESSAGE,
  unknown: "No pudimos iniciar sesion en este momento. Intenta otra vez.",
};

export class AuthLoginError extends Error {
  code: AuthLoginErrorCode;

  constructor(code: AuthLoginErrorCode, message?: string) {
    super(message ?? AUTH_LOGIN_ERROR_COPY[code]);
    this.name = "AuthLoginError";
    this.code = code;
  }
}

function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    name?: string;
    status?: number;
  };

  return [
    candidate.code,
    candidate.message,
    candidate.details,
    candidate.hint,
    candidate.name,
    String(candidate.status ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isOfflineClient() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function getAuthLoginErrorCopy(code: AuthLoginErrorCode) {
  return AUTH_LOGIN_ERROR_COPY[code];
}

export function classifyAuthLoginError(error: unknown) {
  if (error instanceof AuthLoginError) {
    return error;
  }

  const rawText = getErrorText(error);

  if (rawText.includes(AUTH_LOGIN_TIMEOUT_SENTINEL.toLowerCase())) {
    return new AuthLoginError("login_timeout");
  }

  if (rawText.includes(AUTH_COOKIE_NOT_READY_SENTINEL.toLowerCase())) {
    return new AuthLoginError("cookie_not_ready");
  }

  if (
    rawText.includes(GET_ORG_ID_PERMISSION_ERROR_MESSAGE.toLowerCase()) ||
    (rawText.includes("get_org_id") &&
      (rawText.includes("permission denied") || rawText.includes("42501")))
  ) {
    return new AuthLoginError("org_permission_error");
  }

  if (
    rawText.includes("no esta vinculado a una empresa") ||
    rawText.includes("no quedó vinculado a una empresa") ||
    rawText.includes("no quedo vinculado a una empresa")
  ) {
    return new AuthLoginError("profile_missing");
  }

  if (
    rawText.includes("invalid login credentials") ||
    rawText.includes("invalid_credentials") ||
    rawText.includes("correo o contrasena incorrectos")
  ) {
    return new AuthLoginError("invalid_credentials");
  }

  if (
    isOfflineClient() ||
    rawText.includes("failed to fetch") ||
    rawText.includes("network") ||
    rawText.includes("internet_disconnected") ||
    rawText.includes("load failed") ||
    rawText.includes("fetch")
  ) {
    return new AuthLoginError("network_unavailable");
  }

  if (
    rawText.includes("no pudimos abrir la sesion") ||
    rawText.includes("no pudimos confirmar la sesion nueva") ||
    rawText.includes("el usuario autenticado no tiene correo")
  ) {
    return new AuthLoginError("profile_bootstrap_failed");
  }

  return new AuthLoginError("unknown");
}
