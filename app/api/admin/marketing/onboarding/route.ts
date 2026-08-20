import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import {
  createGrowthOnboardingVideo,
  findGrowthOnboardingVideo,
  getGrowthOnboardingWorkspace,
  updateGrowthOnboardingVideoById,
} from "@/features/growth/services/growth-onboarding.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import type {
  CreateGrowthOnboardingVideoInput,
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
    if (body.action === "crear_video_predeterminado") {
      const input = body.input as CreateGrowthOnboardingVideoInput;
      return NextResponse.json({
        video: await createGrowthOnboardingVideo(context, {
          ...input,
          estado: "listo",
          esPredeterminado: true,
        }),
      }, { status: 201 });
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
    if (body.action === "actualizar_video_predeterminado") {
      const workspace = await getGrowthOnboardingWorkspace(context);
      const current = findGrowthOnboardingVideo(workspace.videos, body.input.id);
      return NextResponse.json({ video: await updateGrowthOnboardingVideoById(context, current, body.input as UpdateGrowthOnboardingVideoInput) });
    }
    throw new Error("La acción de onboarding no es válida.");
  } catch (error) {
    return onboardingApiError(error, "No pudimos actualizar el onboarding.");
  }
}
