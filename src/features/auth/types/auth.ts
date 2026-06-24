import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

export type OrganizacionId = string | number;

export type UserRole = "admin" | "tecnico" | "viewer" | string;

export interface AuthProfile {
  organizacionId: OrganizacionId | null;
  rol: UserRole | null;
}

export interface AuthenticatedUser extends AuthProfile {
  user: User | null;
}

export interface AuthUserState extends AuthenticatedUser {
  cargando: boolean;
}

export interface AuthSignInInput {
  email: string;
  password: string;
}

export type AuthOAuthIntent = "login" | "signup";

export type AuthOAuthProvider = "google" | "facebook";

export interface AuthSignInWithOAuthInput {
  provider: AuthOAuthProvider;
  intent: AuthOAuthIntent;
  nextPath?: string | null;
  origin?: string;
}

/** @deprecated Usar AuthSignInWithOAuthInput */
export type AuthSignInWithGoogleInput = Omit<
  AuthSignInWithOAuthInput,
  "provider"
> & {
  provider?: never;
};

export type AuthLoginErrorCode =
  | "invalid_credentials"
  | "network_unavailable"
  | "rate_limited"
  | "device_storage_blocked"
  | "login_timeout"
  | "cookie_not_ready"
  | "profile_missing"
  | "profile_bootstrap_failed"
  | "org_permission_error"
  | "unknown";

export interface AuthProfileLookupOptions {
  accessToken?: string | null;
  preferServerLookup?: boolean;
  retryServerOnUnauthorized?: boolean;
}

export interface AuthSignInResult {
  user: User;
  session: Session;
  accessToken: string;
}

export type AuthSignOutScope = "global" | "local" | "others";

export interface AuthSignOutOptions {
  scope?: AuthSignOutScope;
}

export interface AuthSessionChangePayload {
  event: AuthChangeEvent;
  session: Session | null;
}

export type AuthLoginDiagnosticEventType =
  | "attempt"
  | "success"
  | "failure"
  | "cookie_wait_timeout";

export interface AuthLoginDiagnosticEntry {
  id: string;
  type: AuthLoginDiagnosticEventType;
  code: AuthLoginErrorCode | "none";
  emailMask: string;
  pathname: string;
  nextPath: string | null;
  hostname: string | null;
  online: boolean | null;
  standalone: boolean;
  userAgent: string | null;
  timestamp: string;
  detail: string | null;
}
