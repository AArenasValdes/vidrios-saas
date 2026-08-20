import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import {
  createGrowthContent,
  findGrowthContentItem,
  listGrowthContent,
  updateGrowthContent,
} from "@/features/growth/services/growth-content.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import type {
  CreateGrowthContentItemInput,
  UpdateGrowthContentItemInput,
} from "@/features/growth/types/growth-content";

function contentApiError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return growthApiError(error, fallback);
}

export async function GET() {
  try {
    const context = await resolveGrowthRouteContext();
    return NextResponse.json({ items: await listGrowthContent(context) });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar la cola editorial.");
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const input = (await request.json()) as CreateGrowthContentItemInput;
    return NextResponse.json({ item: await createGrowthContent(context, input) }, { status: 201 });
  } catch (error) {
    return contentApiError(error, "No pudimos crear la pieza de contenido.");
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const input = (await request.json()) as UpdateGrowthContentItemInput;
    if (!input.id) throw new Error("Falta identificar la pieza de contenido.");
    const items = await listGrowthContent(context);
    const current = findGrowthContentItem(items, input.id);
    return NextResponse.json({ item: await updateGrowthContent(context, current, input) });
  } catch (error) {
    return contentApiError(error, "No pudimos actualizar la pieza de contenido.");
  }
}
