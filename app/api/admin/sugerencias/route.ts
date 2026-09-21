import { NextResponse } from "next/server";

import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import {
  AuthRouteAccessError,
} from "@/features/auth/services/auth-route-access.service";
import { getAdminProductFeedbackWorkspace } from "@/features/product-feedback/services/admin-product-feedback.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await resolveVentoraAdminRouteContext();
    const workspace = await getAdminProductFeedbackWorkspace();
    return NextResponse.json(
      { workspace },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("No se pudieron cargar las sugerencias de producto.", error);
    return NextResponse.json(
      { error: "No pudimos cargar las sugerencias." },
      { status: 500 }
    );
  }
}
