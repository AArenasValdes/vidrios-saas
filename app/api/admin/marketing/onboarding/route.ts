import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import {
  createGrowthOnboardingAssignment,
  createGrowthOnboardingVideo,
  findGrowthOnboardingVideo,
  getGrowthOnboardingWorkspace,
  updateGrowthOnboardingAssignmentById,
  updateGrowthOnboardingVideoById,
} from "@/features/growth/services/growth-onboarding.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import type {
  CreateGrowthOnboardingAssignmentInput,
  CreateGrowthOnboardingVideoInput,
  UpdateGrowthOnboardingAssignmentInput,
  UpdateGrowthOnboardingVideoInput,
} from "@/features/growth/types/growth-onboarding";

function onboardingApiError(error: unknown, fallback: string) {
  if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
  return growthApiError(error, fallback);
}

export async function GET() {
  try {
    const context = await resolveGrowthRouteContext();
    return NextResponse.json({ workspace: await getGrowthOnboardingWorkspace(context) });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar el onboarding.");
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as { action?: string; input?: unknown };
    if (body.action === "crear_video") {
      return NextResponse.json({ video: await createGrowthOnboardingVideo(context, body.input as CreateGrowthOnboardingVideoInput) }, { status: 201 });
    }
    if (body.action === "asignar_video") {
      const workspace = await getGrowthOnboardingWorkspace(context);
      return NextResponse.json({ assignment: await createGrowthOnboardingAssignment(context, body.input as CreateGrowthOnboardingAssignmentInput, workspace.videos) }, { status: 201 });
    }
    throw new Error("La acción de onboarding no es válida.");
  } catch (error) {
    return onboardingApiError(error, "No pudimos guardar el onboarding.");
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as { action?: string; input?: { id?: string } };
    if (!body.input?.id) throw new Error("Falta identificar el registro de onboarding.");
    if (body.action === "actualizar_video") {
      const workspace = await getGrowthOnboardingWorkspace(context);
      const current = findGrowthOnboardingVideo(workspace.videos, body.input.id);
      return NextResponse.json({ video: await updateGrowthOnboardingVideoById(context, current, body.input as UpdateGrowthOnboardingVideoInput) });
    }
    if (body.action === "actualizar_asignacion") {
      return NextResponse.json({ assignment: await updateGrowthOnboardingAssignmentById(context, body.input as UpdateGrowthOnboardingAssignmentInput) });
    }
    throw new Error("La acción de onboarding no es válida.");
  } catch (error) {
    return onboardingApiError(error, "No pudimos actualizar el onboarding.");
  }
}
