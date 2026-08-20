import "server-only";

import {
  insertGrowthOnboardingVideo,
  listGrowthOnboardingEvents,
  listGrowthOnboardingVideos,
  updateGrowthOnboardingVideo,
} from "@/features/growth/repositories/growth-onboarding.repository";
import type { GrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import {
  GROWTH_ONBOARDING_DEVICES,
  GROWTH_ONBOARDING_STEPS,
  GROWTH_ONBOARDING_VIDEO_STATUSES,
  type CreateGrowthOnboardingVideoInput,
  type GrowthOnboardingVideo,
  type GrowthOnboardingVideoStatus,
  type UpdateGrowthOnboardingVideoInput,
} from "@/features/growth/types/growth-onboarding";

const TEXT_LIMITS = { slug: 80, title: 160, summary: 1000 } as const;

function normalizeText(value: string | null | undefined, limit: number) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized.slice(0, limit) : null;
}

function requireText(value: string | null | undefined, limit: number, label: string) {
  const normalized = normalizeText(value, limit);
  if (!normalized) throw new Error(`${label} es obligatorio.`);
  return normalized;
}

function assertOneOf<T extends string>(value: string, values: readonly T[], label: string): T {
  if (!values.includes(value as T)) throw new Error(`${label} no es válido.`);
  return value as T;
}

function normalizeSlug(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, TEXT_LIMITS.slug);
  if (!/^[a-z0-9][a-z0-9_-]{2,79}$/.test(normalized)) {
    throw new Error("El identificador debe usar minúsculas, números, guiones o guiones bajos.");
  }
  return normalized;
}

function normalizeVideoUrl(value: string | null | undefined) {
  const normalized = normalizeText(value, 2000);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error("La URL del video debe comenzar con https://.");
  }
}

function normalizeDuration(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  const normalized = Math.round(Number(value));
  if (!Number.isFinite(normalized) || normalized < 15 || normalized > 900) {
    throw new Error("La duración debe estar entre 15 segundos y 15 minutos.");
  }
  return normalized;
}

function ensureVideoCanBeReady(input: { estado: GrowthOnboardingVideoStatus; videoUrl: string | null }) {
  if (input.estado === "listo" && !input.videoUrl) {
    throw new Error("Agrega la URL HTTPS antes de dejar disponible un video.");
  }
}

function ensureVideoCanBeDefault(input: {
  estado: GrowthOnboardingVideoStatus;
  videoUrl: string | null;
  dispositivo: GrowthOnboardingVideo["dispositivo"];
}) {
  if (input.dispositivo === "ambos") {
    throw new Error("El onboarding automático requiere un video específico para celular o computador.");
  }
  ensureVideoCanBeReady(input);
}

async function setGrowthOnboardingDefault(
  context: GrowthRouteContext,
  video: GrowthOnboardingVideo
) {
  ensureVideoCanBeDefault(video);
  const { error: clearError } = await context.supabase
    .from("growth_onboarding_videos")
    .update({ es_predeterminado: false })
    .eq("workspace_id", context.workspaceId)
    .eq("dispositivo", video.dispositivo)
    .eq("es_predeterminado", true)
    .is("eliminado_en", null);
  if (clearError) throw clearError;
  return updateGrowthOnboardingVideo(context.supabase, context.workspaceId, video.id, {
    es_predeterminado: true,
  });
}

export async function getGrowthOnboardingWorkspace(context: GrowthRouteContext) {
  const [videos, events] = await Promise.all([
    listGrowthOnboardingVideos(context.supabase, context.workspaceId),
    listGrowthOnboardingEvents(context.supabase, context.workspaceId),
  ]);

  return {
    videos,
    events,
  };
}

export async function createGrowthOnboardingVideo(
  context: GrowthRouteContext,
  input: CreateGrowthOnboardingVideoInput
) {
  const estado = input.estado ?? "borrador";
  const videoUrl = normalizeVideoUrl(input.videoUrl);
  const dispositivo = assertOneOf(input.dispositivo, GROWTH_ONBOARDING_DEVICES, "Dispositivo");
  ensureVideoCanBeReady({ estado, videoUrl });
  if (input.esPredeterminado) ensureVideoCanBeDefault({ estado, videoUrl, dispositivo });
  const video = await insertGrowthOnboardingVideo(context.supabase, {
    workspace_id: context.workspaceId,
    slug: normalizeSlug(input.slug),
    titulo: requireText(input.titulo, TEXT_LIMITS.title, "Título"),
    resumen: normalizeText(input.resumen, TEXT_LIMITS.summary),
    paso: assertOneOf(input.paso, GROWTH_ONBOARDING_STEPS, "Paso"),
    dispositivo,
    duracion_segundos: normalizeDuration(input.duracionSegundos),
    video_url: videoUrl,
    estado: assertOneOf(estado, GROWTH_ONBOARDING_VIDEO_STATUSES, "Estado"),
    es_predeterminado: false,
    orden: Number.isFinite(input.orden) ? Math.max(0, Math.round(input.orden ?? 0)) : 0,
  });
  return input.esPredeterminado ? setGrowthOnboardingDefault(context, video) : video;
}

export async function updateGrowthOnboardingVideoById(
  context: GrowthRouteContext,
  current: GrowthOnboardingVideo,
  input: UpdateGrowthOnboardingVideoInput
) {
  const estado = input.estado ?? current.estado;
  const videoUrl = input.videoUrl === undefined ? current.videoUrl : normalizeVideoUrl(input.videoUrl);
  ensureVideoCanBeReady({ estado, videoUrl });
  if (input.esPredeterminado) {
    ensureVideoCanBeDefault({ estado, videoUrl, dispositivo: current.dispositivo });
  }
  const patch: Record<string, unknown> = {
    estado: assertOneOf(estado, GROWTH_ONBOARDING_VIDEO_STATUSES, "Estado"),
    video_url: videoUrl,
  };
  if (input.titulo !== undefined) patch.titulo = requireText(input.titulo, TEXT_LIMITS.title, "Título");
  if (input.resumen !== undefined) patch.resumen = normalizeText(input.resumen, TEXT_LIMITS.summary);
  if (input.orden !== undefined) {
    if (!Number.isFinite(input.orden)) throw new Error("El orden debe ser numérico.");
    patch.orden = Math.max(0, Math.round(input.orden));
  }
  if (input.duracionSegundos !== undefined) {
    patch.duracion_segundos = normalizeDuration(input.duracionSegundos);
  }
  if (input.esPredeterminado === false) patch.es_predeterminado = false;
  const video = await updateGrowthOnboardingVideo(context.supabase, context.workspaceId, current.id, patch);
  return input.esPredeterminado ? setGrowthOnboardingDefault(context, video) : video;
}

export function findGrowthOnboardingVideo(videos: GrowthOnboardingVideo[], id: string) {
  const video = videos.find((item) => item.id === id);
  if (!video) throw new Error("El video de onboarding no existe.");
  return video;
}
