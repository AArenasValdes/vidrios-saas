import { NextResponse } from "next/server";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import {
  isProductAnnouncementId,
  parseProductAnnouncementInput,
  parseProductAnnouncementStatus,
} from "@/features/product-announcements/services/product-announcement-input";
import { updateAdminProductAnnouncement } from "@/features/product-announcements/services/product-announcement.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await resolveVentoraAdminRouteContext();
    const { id } = await context.params;
    if (!isProductAnnouncementId(id)) {
      return NextResponse.json({ error: "La novedad indicada no es válida." }, { status: 400 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Los cambios no son válidos." }, { status: 400 });
    }
    const input = parseProductAnnouncementInput(body);
    const status = typeof body === "object" && body !== null && "status" in body
      ? parseProductAnnouncementStatus(body.status)
      : null;
    if (!input || !status) {
      return NextResponse.json({ error: "Revisa el contenido y el estado de publicación." }, { status: 400 });
    }
    await updateAdminProductAnnouncement(id, input, status);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("No se pudo actualizar una novedad.", error);
    return NextResponse.json({ error: "No pudimos actualizar la novedad." }, { status: 500 });
  }
}
