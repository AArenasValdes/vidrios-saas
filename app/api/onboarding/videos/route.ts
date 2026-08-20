import { NextResponse } from "next/server";

import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createAdminClient } from "@/lib/supabase/admin";

type Device = "movil" | "escritorio";

type AdminMutationResult = PromiseLike<{ error: { message: string } | null }>;
type AdminMutationQuery = AdminMutationResult & {
  eq(column: string, value: unknown): AdminMutationQuery;
};
type AdminMutationTable = {
  update(values: Record<string, unknown>): AdminMutationQuery;
  insert(values: Record<string, unknown>): AdminMutationResult;
};

function getAdminMutationTable(admin: ReturnType<typeof createAdminClient>, table: string) {
  return admin.from(table) as unknown as AdminMutationTable;
}

function apiError(error: unknown) {
  if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "No pudimos cargar tu guía de onboarding.";
  return NextResponse.json({ error: message }, { status: 400 });
}

function resolveDevice(value: string | null): Device {
  if (value === "movil" || value === "escritorio") return value;
  throw new Error("El dispositivo no es válido.");
}

export async function GET(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();
    const device = resolveDevice(new URL(request.url).searchParams.get("dispositivo"));
    const organizationId = Number(context.profile.organizationId);
    const admin = createAdminClient();
    const { data: assignments, error: assignmentsError } = await admin
      .from("growth_onboarding_assignments")
      .select("id, workspace_id, video_id, estado")
      .eq("organization_id", organizationId)
      .in("estado", ["pendiente", "visto"])
      .is("eliminado_en", null)
      .order("asignado_en", { ascending: false });
    if (assignmentsError) throw assignmentsError;

    const assignmentRows = (assignments ?? []) as Array<{ id: string; workspace_id: string; video_id: string; estado: string }>;
    if (assignmentRows.length === 0) return NextResponse.json({ guide: null });

    const { data: videos, error: videosError } = await admin
      .from("growth_onboarding_videos")
      .select("id, titulo, resumen, dispositivo, duracion_segundos, video_url, orden")
      .in("id", assignmentRows.map((assignment) => assignment.video_id))
      .eq("estado", "listo")
      .is("eliminado_en", null)
      .in("dispositivo", [device, "ambos"])
      .order("orden", { ascending: true });
    if (videosError) throw videosError;

    const videoRows = (videos ?? []) as Array<{
      id: string;
      titulo: string;
      resumen: string | null;
      dispositivo: string;
      duracion_segundos: number | null;
      video_url: string | null;
      orden: number;
    }>;
    const videoById = new Map(videoRows.map((video) => [String(video.id), video]));
    const assignment = assignmentRows.find((item) => videoById.has(item.video_id));
    if (!assignment) return NextResponse.json({ guide: null });
    const video = videoById.get(assignment.video_id);
    if (!video || !video.video_url) return NextResponse.json({ guide: null });

    return NextResponse.json({
      guide: {
        assignmentId: assignment.id,
        titulo: video.titulo,
        resumen: video.resumen,
        dispositivo: video.dispositivo,
        duracionSegundos: video.duracion_segundos,
        videoUrl: video.video_url,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();
    const body = (await request.json()) as { assignmentId?: string; action?: string };
    if (body.action !== "abrir_video" || !body.assignmentId) throw new Error("No pudimos registrar la guía.");
    const organizationId = Number(context.profile.organizationId);
    const admin = createAdminClient();
    const { data: assignment, error: assignmentError } = await admin
      .from("growth_onboarding_assignments")
      .select("id, workspace_id, organization_id, video_id, estado, visto_en")
      .eq("id", body.assignmentId).eq("organization_id", organizationId).is("eliminado_en", null).maybeSingle();
    if (assignmentError) throw assignmentError;
    const assignmentRow = assignment as {
      id: string;
      workspace_id: string;
      organization_id: number;
      video_id: string;
      estado: string;
      visto_en: string | null;
    } | null;
    if (!assignmentRow || assignmentRow.estado === "pausado") throw new Error("Esta guía ya no está disponible.");

    const openedAt = new Date().toISOString();
    const nextState = assignmentRow.estado === "pendiente" ? "visto" : assignmentRow.estado;
    const { error: updateError } = await getAdminMutationTable(
      admin,
      "growth_onboarding_assignments"
    ).update({
      estado: nextState,
      visto_en: assignmentRow.visto_en ?? openedAt,
    }).eq("id", assignmentRow.id).eq("organization_id", organizationId);
    if (updateError) throw updateError;

    const { error: eventError } = await getAdminMutationTable(
      admin,
      "growth_onboarding_events"
    ).insert({
      workspace_id: assignmentRow.workspace_id,
      organization_id: organizationId,
      assignment_id: assignmentRow.id,
      video_id: assignmentRow.video_id,
      tipo: "video_abierto",
      fuente: "cliente",
      ocurrido_en: openedAt,
    });
    if (eventError) throw eventError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
