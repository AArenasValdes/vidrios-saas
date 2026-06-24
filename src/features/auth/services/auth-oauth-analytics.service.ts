import type { AuthOAuthProvider } from "@/features/auth/types/auth";

export type OAuthAnalyticsEvent =
  | `${AuthOAuthProvider}_oauth_returned`
  | `${AuthOAuthProvider}_existing_login`
  | `${AuthOAuthProvider}_signup_started`;

export function buildOAuthAnalyticsEvent(
  provider: AuthOAuthProvider,
  kind: "returned" | "existing_login" | "signup_started"
): OAuthAnalyticsEvent {
  if (kind === "returned") {
    return `${provider}_oauth_returned`;
  }

  if (kind === "existing_login") {
    return `${provider}_existing_login`;
  }

  return `${provider}_signup_started`;
}

export function resolveOAuthProvider(
  value: string | null | undefined
): AuthOAuthProvider {
  return value === "facebook" ? "facebook" : "google";
}
