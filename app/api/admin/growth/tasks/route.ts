import { NextResponse } from "next/server";

import { insertTask, listTasks, updateTask } from "@/features/growth/repositories/growth-tasks.repository";
import { growthApiError } from "@/features/growth/services/growth-api-response";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";

export async function GET(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const { searchParams } = new URL(request.url);
    const pendingOnly = searchParams.get("pending") === "1";
    const tasks = await listTasks(context.supabase, context.workspaceId, {
      pendingOnly,
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar las tareas.");
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as Record<string, unknown>;
    const task = await insertTask(context.supabase, {
      workspace_id: context.workspaceId,
      creado_por_auth_user_id: context.user.id,
      ...body,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return growthApiError(error, "No pudimos crear la tarea.");
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as {
      id: string;
      completada?: boolean;
      vence_en?: string | null;
      eliminado_en?: string | null;
    };
    const patch: Record<string, unknown> = {};

    if (body.completada) {
      patch.completada_en = new Date().toISOString();
    }
    if ("vence_en" in body) {
      patch.vence_en = body.vence_en;
    }
    if (body.eliminado_en) {
      patch.eliminado_en = body.eliminado_en;
    }

    const task = await updateTask(
      context.supabase,
      context.workspaceId,
      body.id,
      patch
    );
    return NextResponse.json({ task });
  } catch (error) {
    return growthApiError(error, "No pudimos actualizar la tarea.");
  }
}
