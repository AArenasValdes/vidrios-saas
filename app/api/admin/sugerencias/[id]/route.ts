import { NextResponse } from "next/server";

import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import { updateAdminProductFeedbackStatus } from "@/features/product-feedback/services/admin-product-feedback.service";
import {
  isProductFeedbackStatus,
  type ProductFeedbackStatus,
} from "@/features/product-feedback/types/product-feedback";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await resolveVentoraAdminRouteContext();
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "La sugerencia indicada no es válida." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "El cambio no es válido." }, { status: 400 });
    }

    const status =
      typeof body === "object" && body !== null && "status" in body
        ? body.status
        : null;
    if (!isProductFeedbackStatus(status)) {
      return NextResponse.json({ error: "Elige un estado válido." }, { status: 400 });
    }

    await updateAdminProductFeedbackStatus(id, status as ProductFeedbackStatus);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("No se pudo actualizar el estado de una sugerencia.", error);
    return NextResponse.json(
      { error: "No pudimos actualizar la sugerencia." },
      { status: 500 }
    );
  }
}
