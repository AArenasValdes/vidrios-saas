import { NextResponse } from "next/server";
import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  getPublishedProductAnnouncements,
  getProductAnnouncementUnreadCount,
  markProductAnnouncementRead,
} from "@/features/product-announcements/services/product-announcement.service";
import { isProductAnnouncementId } from "@/features/product-announcements/services/product-announcement-input";

export const dynamic = "force-dynamic";

function resolveTenant(context: Awaited<ReturnType<typeof resolveAuthenticatedRouteContext>>) {
  const organizationId = Number(context.profile.organizationId);
  if (!Number.isSafeInteger(organizationId) || organizationId <= 0) {
    throw new AuthRouteAccessError(403, "No pudimos identificar la empresa activa.");
  }
  return { organizationId, authUserId: context.user.id };
}

export async function GET(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();
    const { organizationId, authUserId } = resolveTenant(context);
    if (new URL(request.url).searchParams.get("summary") === "1") {
      const unreadCount = await getProductAnnouncementUnreadCount(organizationId, authUserId);
      return NextResponse.json(
        { unreadCount },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
    const result = await getPublishedProductAnnouncements(organizationId, authUserId);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("No se pudieron cargar las novedades de Ventora.", error);
    return NextResponse.json({ error: "No pudimos cargar las novedades." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();
    const { organizationId, authUserId } = resolveTenant(context);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "La novedad indicada no es válida." }, { status: 400 });
    }
    const announcementId =
      typeof body === "object" && body !== null && "announcementId" in body
        ? body.announcementId
        : null;
    if (typeof announcementId !== "string" || !isProductAnnouncementId(announcementId)) {
      return NextResponse.json({ error: "La novedad indicada no es válida." }, { status: 400 });
    }
    await markProductAnnouncementRead(announcementId, organizationId, authUserId);
    const unreadCount = await getProductAnnouncementUnreadCount(organizationId, authUserId);
    return NextResponse.json({ unreadCount }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("No se pudo registrar la lectura de una novedad.", error);
    return NextResponse.json({ error: "No pudimos guardar la lectura." }, { status: 500 });
  }
}
