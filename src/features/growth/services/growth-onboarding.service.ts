import "server-only";

import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import {
  insertGrowthOnboardingAssignment,
  insertGrowthOnboardingVideo,
  listGrowthOnboardingAssignments,
  listGrowthOnboardingEvents,
  listGrowthOnboardingVideos,
  updateGrowthOnboardingAssignment,
  updateGrowthOnboardingVideo,
} from "@/features/growth/repositories/growth-onboarding.repository";
import type { GrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import {
  GROWTH_ONBOARDING_ASSIGNMENT_STATUSES,
  GROWTH_ONBOARDING_DEVICES,
  GROWTH_ONBOARDING_STEPS,
  GROWTH_ONBOARDING_VIDEO_STATUSES,
  type CreateGrowthOnboardingAssignmentInput,
  type CreateGrowthOnboardingVideoInput,
  type GrowthOnboardingAssignmentStatus,
  type GrowthOnboardingVideo,
  type GrowthOnboardingVideoStatus,
  type UpdateGrowthOnboardingAssignmentInput,
  type UpdateGrowthOnboardingVideoInput,
} from "@/features/growth/types/growth-onboarding";

const TEXT_LIMITS = { slug: 80, title: 160, summary: 1000, notes: 1000 } as const;

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

export async function getGrowthOnboardingWorkspace(context: GrowthRouteContext) {
  const [videos, assignments, events, clients] = await Promise.all([
    listGrowthOnboardingVideos(context.supabase, context.workspaceId),
    listGrowthOnboardingAssignments(context.supabase, context.workspaceId),
    listGrowthOnboardingEvents(context.supabase, context.workspaceId),
    listAdminClients(),
  ]);

  return {
    videos,
    assignments,
    events,
    organizations: clients.map((client) => ({
      organizationId: client.organizationId,
      empresaNombre: client.empresaNombre,
    })),
  };
}

export async function createGrowthOnboardingVideo(
  context: GrowthRouteContext,
  input: CreateGrowthOnboardingVideoInput
) {
  const estado = input.estado ?? "borrador";
  const videoUrl = normalizeVideoUrl(input.videoUrl);
  ensureVideoCanBeReady({ estado, videoUrl });
  return insertGrowthOnboardingVideo(context.supabase, {
    workspace_id: context.workspaceId,
    slug: normalizeSlug(input.slug),
    titulo: requireText(input.titulo, TEXT_LIMITS.title, "Título"),
    resumen: normalizeText(input.resumen, TEXT_LIMITS.summary),
    paso: assertOneOf(input.paso, GROWTH_ONBOARDING_STEPS, "Paso"),
    dispositivo: assertOneOf(input.dispositivo, GROWTH_ONBOARDING_DEVICES, "Dispositivo"),
    duracion_segundos: normalizeDuration(input.duracionSegundos),
    video_url: videoUrl,
    estado: assertOneOf(estado, GROWTH_ONBOARDING_VIDEO_STATUSES, "Estado"),
    orden: Number.isFinite(input.orden) ? Math.max(0, Math.round(input.orden ?? 0)) : 0,
  });
}

export async function updateGrowthOnboardingVideoById(
  context: GrowthRouteContext,
  current: GrowthOnboardingVideo,
  input: UpdateGrowthOnboardingVideoInput
) {
  const estado = input.estado ?? current.estado;
  const videoUrl = input.videoUrl === undefined ? current.videoUrl : normalizeVideoUrl(input.videoUrl);
  ensureVideoCanBeReady({ estado, videoUrl });
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
  return updateGrowthOnboardingVideo(context.supabase, context.workspaceId, current.id, patch);
}

export async function createGrowthOnboardingAssignment(
  context: GrowthRouteContext,
  input: CreateGrowthOnboardingAssignmentInput,
  videos: GrowthOnboardingVideo[]
) {
  const organizationId = Math.trunc(Number(input.organizationId));
  if (!Number.isSafeInteger(organizationId) || organizationId <= 0) {
    throw new Error("Selecciona una empresa válida.");
  }
  const video = videos.find((item) => item.id === input.videoId && item.estado === "listo");
  if (!video) throw new Error("Selecciona un video disponible antes de asignarlo.");
  return insertGrowthOnboardingAssignment(context.supabase, {
    workspace_id: context.workspaceId,
    organization_id: organizationId,
    video_id: video.id,
    asignado_por_auth_user_id: context.user.id,
    notas: normalizeText(input.notas, TEXT_LIMITS.notes),
  });
}

export async function updateGrowthOnboardingAssignmentById(
  context: GrowthRouteContext,
  input: UpdateGrowthOnboardingAssignmentInput
) {
  const estado = assertOneOf(input.estado, GROWTH_ONBOARDING_ASSIGNMENT_STATUSES, "Estado");
  const patch: Record<string, unknown> = { estado };
  if (estado === "completado") patch.completado_en = new Date().toISOString();
  if (estado === "pendiente") {
    patch.visto_en = null;
    patch.completado_en = null;
  }
  return updateGrowthOnboardingAssignment(context.supabase, context.workspaceId, input.id, patch);
}

export function findGrowthOnboardingVideo(videos: GrowthOnboardingVideo[], id: string) {
  const video = videos.find((item) => item.id === id);
  if (!video) throw new Error("El video de onboarding no existe.");
  return video;
}

export function normalizeAssignmentStatus(value: string): GrowthOnboardingAssignmentStatus {
  return assertOneOf(value, GROWTH_ONBOARDING_ASSIGNMENT_STATUSES, "Estado");
}
