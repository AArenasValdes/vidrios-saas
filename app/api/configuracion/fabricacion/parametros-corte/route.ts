import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  FabricationCutSettingsSchemaMissingError,
  getFabricationCutSettings,
  saveFabricationCutSettings,
} from "@/features/fabricacion/repositories/fabrication-cut-settings.repository";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  perdidaCorteMm: z.number().int().min(0).max(20),
  despunteInicialMm: z.number().int().min(0).max(1000),
  procedimiento: z.literal("por_pieza"),
  confirmacionExplicita: z.literal(true),
}).strict();

function responseError(error: unknown) {
  if (error instanceof AuthRouteAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof FabricationCutSettingsSchemaMissingError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  console.error("[API] parámetros de corte del taller", error);
  return NextResponse.json({ error: "No pudimos cargar o guardar los parámetros de corte." }, { status: 500 });
}

async function readJson(request: Request): Promise<unknown | null> {
  try { return await request.json() as unknown; }
  catch { return null; }
}

function organizationId(value: string | number | null) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AuthRouteAccessError(403, "No encontramos una organización activa.");
  }
  return parsed;
}

export async function GET() {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    const settings = await getFabricationCutSettings(organizationId(auth.profile.organizationId));
    return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return responseError(error); }
}

export async function PUT(request: Request) {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    if (!canManageSupplierCatalog(auth.profile.rol)) {
      throw new AuthRouteAccessError(403, "Solo administradores y maestros pueden confirmar estos parámetros.");
    }
    const parsed = saveSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return NextResponse.json({ error: "Ingresa valores válidos y confirma el procedimiento habitual del taller." }, { status: 400 });
    }
    const settings = await saveFabricationCutSettings({
      organizationId: organizationId(auth.profile.organizationId),
      userId: auth.user.id,
      perdidaCorteMm: parsed.data.perdidaCorteMm,
      despunteInicialMm: parsed.data.despunteInicialMm,
    });
    return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return responseError(error); }
}
