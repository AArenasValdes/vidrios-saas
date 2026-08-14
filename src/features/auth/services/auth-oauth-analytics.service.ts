import type { AuthCallbackProvider } from "@/features/auth/types/auth";

export type OAuthAnalyticsEvent =
  | `${AuthCallbackProvider}_oauth_returned`
  | `${AuthCallbackProvider}_existing_login`
  | `${AuthCallbackProvider}_signup_started`;

export function buildOAuthAnalyticsEvent(
  provider: AuthCallbackProvider,
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
): AuthCallbackProvider | null {
  return value === "google" || value === "email" ? value : null;
}
