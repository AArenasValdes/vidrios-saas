import type { DashboardSummary } from "@/features/dashboard/types/dashboard-summary";

export async function getDashboardSummaryByOrganizationId(
  organizationId: string | number
): Promise<DashboardSummary> {
  void organizationId;
  const response = await fetch("/api/dashboard/summary", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { summary?: DashboardSummary; error?: string }
    | null;

  if (!response.ok || !payload?.summary) {
    throw new Error(
      payload?.error ?? "No pudimos cargar el resumen del dashboard."
    );
  }

  return payload.summary;
}

export type { DashboardSummary } from "@/features/dashboard/types/dashboard-summary";
