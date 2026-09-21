import { NextResponse } from "next/server";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import { parseProductAnnouncementInput } from "@/features/product-announcements/services/product-announcement-input";
import {
  createAdminProductAnnouncement,
  getAdminProductAnnouncementWorkspace,
} from "@/features/product-announcements/services/product-announcement.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await resolveVentoraAdminRouteContext();
    const workspace = await getAdminProductAnnouncementWorkspace();
    return NextResponse.json({ workspace }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("No se pudo cargar la administración de novedades.", error);
    return NextResponse.json({ error: "No pudimos cargar las novedades." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveVentoraAdminRouteContext();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Completa los datos de la novedad." }, { status: 400 });
    }
    const input = parseProductAnnouncementInput(body);
    if (!input) {
      return NextResponse.json({ error: "Revisa el título, resumen, contenido y enlace." }, { status: 400 });
    }
    const id = await createAdminProductAnnouncement(input, context.user.id);
    return NextResponse.json({ id }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("No se pudo guardar el borrador de novedad.", error);
    return NextResponse.json({ error: "No pudimos guardar el borrador." }, { status: 500 });
  }
}
