import { NextResponse } from "next/server";

import { getAdminProductoWorkspace } from "@/features/admin/services/admin-producto.service";
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

    const workspace = await getAdminProductoWorkspace({
      period: parsedPeriod,
      customStart: searchParams.get("from"),
      customEnd: searchParams.get("to"),
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Fallo la carga admin producto.", error);
    return NextResponse.json({ error: "No pudimos cargar uso del producto." }, { status: 500 });
  }
}
