import { NextResponse } from "next/server";

import { getAdminMarketingWorkspace } from "@/features/admin/services/admin-marketing.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import type { MarketingPeriodPreset } from "@/features/admin/types/admin-marketing";

export async function GET(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const parsedPeriod: MarketingPeriodPreset | undefined =
      period === "7d" || period === "30d" || period === "month" || period === "custom"
        ? period
        : undefined;

    const workspace = await getAdminMarketingWorkspace({
      period: parsedPeriod,
      customStart: searchParams.get("from"),
      customEnd: searchParams.get("to"),
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Fallo la carga admin marketing.", error);
    return NextResponse.json({ error: "No pudimos cargar marketing." }, { status: 500 });
  }
}
