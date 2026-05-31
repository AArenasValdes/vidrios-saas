import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

export async function fetchSubscriptionSummary(): Promise<SubscriptionSummary | null> {
  const response = await fetch("/api/subscriptions/summary", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as {
    summary?: SubscriptionSummary | null;
    error?: string;
  } | null;

  if (!response.ok || !payload) {
    return null;
  }

  return payload.summary ?? null;
}
