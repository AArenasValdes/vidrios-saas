import { NextResponse } from "next/server";

import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createAdminClient } from "@/lib/supabase/admin";

type Device = "movil" | "escritorio";
type GuideSource = "predeterminada" | "piloto";

type AdminMutationResult = PromiseLike<{ error: { message: string; code?: string } | null }>;
type AdminMutationTable = { insert(values: Record<string, unknown>): AdminMutationResult };

type VideoRow = {
  id: string;
  workspace_id: string;
  titulo: string;
  resumen: string | null;
  dispositivo: Device | "ambos";
  duracion_segundos: number | null;
  video_url: string | null;
  orden: number;
};

type ResolvedGuide = ReturnType<typeof guideFromVideo>;

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

function guideFromVideo(video: VideoRow, source: GuideSource, assignmentId: string | null = null) {
  if (!video.video_url) return null;
  return {
    assignmentId,
    videoId: video.id,
    workspaceId: video.workspace_id,
    source,
    titulo: video.titulo,
    resumen: video.resumen,
    dispositivo: video.dispositivo,
    duracionSegundos: video.duracion_segundos,
    videoUrl: video.video_url,
  };
}

function publicGuide(guide: NonNullable<ResolvedGuide> | null) {
  if (!guide) return null;
  return {
    assignmentId: guide.assignmentId,
    videoId: guide.videoId,
    source: guide.source,
    titulo: guide.titulo,
    resumen: guide.resumen,
    dispositivo: guide.dispositivo,
    duracionSegundos: guide.duracionSegundos,
    videoUrl: guide.videoUrl,
  };
}

async function findDefaultGuide(admin: ReturnType<typeof createAdminClient>, device: Device) {
  const { data: workspace, error: workspaceError } = await admin
    .from("growth_workspaces")
    .select("id")
    .eq("slug", "ventora-founder")
    .is("eliminado_en", null)
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  const workspaceRow = workspace as { id: string } | null;
  if (!workspaceRow) return null;

  const { data, error } = await admin
    .from("growth_onboarding_videos")
    .select("id, workspace_id, titulo, resumen, dispositivo, duracion_segundos, video_url, orden")
    .eq("workspace_id", workspaceRow.id)
    .eq("es_predeterminado", true)
    .eq("dispositivo", device)
    .eq("estado", "listo")
    .is("eliminado_en", null)
    .not("video_url", "is", null)
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? guideFromVideo(data as VideoRow, "predeterminada") : null;
}

async function findPilotGuide(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: number,
  device: Device
) {
  const { data: assignments, error: assignmentsError } = await admin
    .from("growth_onboarding_assignments")
    .select("id, video_id")
    .eq("organization_id", organizationId)
    .in("estado", ["pendiente", "visto"])
    .is("eliminado_en", null)
    .order("asignado_en", { ascending: false });
  if (assignmentsError) throw assignmentsError;

  const assignmentRows = (assignments ?? []) as Array<{ id: string; video_id: string }>;
  if (assignmentRows.length === 0) return null;
  const { data: videos, error: videosError } = await admin
    .from("growth_onboarding_videos")
    .select("id, workspace_id, titulo, resumen, dispositivo, duracion_segundos, video_url, orden")
    .in("id", assignmentRows.map((assignment) => assignment.video_id))
    .eq("estado", "listo")
    .is("eliminado_en", null)
    .in("dispositivo", [device, "ambos"])
    .order("orden", { ascending: true });
  if (videosError) throw videosError;

  const videoById = new Map(((videos ?? []) as VideoRow[]).map((video) => [video.id, video]));
  const assignment = assignmentRows.find((item) => videoById.has(item.video_id));
  const video = assignment ? videoById.get(assignment.video_id) : null;
  return video ? guideFromVideo(video, "piloto", assignment?.id ?? null) : null;
}

async function resolveGuide(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: number,
  device: Device
) {
  return (await findDefaultGuide(admin, device)) ?? findPilotGuide(admin, organizationId, device);
}

export async function GET(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();
    const device = resolveDevice(new URL(request.url).searchParams.get("dispositivo"));
    const admin = createAdminClient();
    const guide = await resolveGuide(admin, Number(context.profile.organizationId), device);
    return NextResponse.json({ guide: publicGuide(guide) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();
    const body = (await request.json()) as {
      action?: string;
      videoId?: string;
      assignmentId?: string | null;
      source?: GuideSource;
      dispositivo?: Device;
    };
    if (body.action !== "abrir_video" || !body.videoId || !body.source || !body.dispositivo) {
      throw new Error("No pudimos registrar la guía.");
    }

    const organizationId = Number(context.profile.organizationId);
    const admin = createAdminClient();
    const guide = await resolveGuide(admin, organizationId, resolveDevice(body.dispositivo));
    if (!guide || guide.videoId !== body.videoId || guide.source !== body.source || guide.assignmentId !== (body.assignmentId ?? null)) {
      throw new Error("Esta guía ya no está disponible.");
    }

    const { error: eventError } = await getAdminMutationTable(admin, "growth_onboarding_events").insert({
      workspace_id: guide.workspaceId,
      organization_id: organizationId,
      assignment_id: guide.assignmentId,
      video_id: guide.videoId,
      tipo: "video_abierto",
      fuente: "cliente",
      ocurrido_en: new Date().toISOString(),
    });
    if (eventError && eventError.code !== "23505") throw eventError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
