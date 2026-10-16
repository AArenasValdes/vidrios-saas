import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { readConfirmedSupplierPresentations } from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import {
  deleteSupplierFamilyPreference,
  listSupplierFamilyPreferences,
  SupplierFamilyPreferencesSchemaMissingError,
  upsertSupplierFamilyPreference,
} from "@/features/proveedor-catalogos/repositories/supplier-family-preferences.repository";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { isSupplierProviderCompatibleWithFamily } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";

export const dynamic = "force-dynamic";

const familySchema = z.string().trim().min(1).max(180);
const putSchema = z.object({
  familyKey: familySchema,
  providerKey: z.string().trim().min(1).max(100),
}).strict();
const deleteSchema = z.object({ familyKey: familySchema }).strict();

function knownFamilyKeys() {
  return new Set(VENTORA_DEFAULT_LINE_CATALOG.flatMap((line) => {
    const familyKey = line.catalogMetadata?.familyKey;
    return typeof familyKey === "string" && familyKey.trim() ? [familyKey] : [];
  }));
}

function responseError(error: unknown) {
  if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SupplierFamilyPreferencesSchemaMissingError) return NextResponse.json({ error: error.message }, { status: 503 });
  console.error("[API] proveedor habitual por familia", error);
  return NextResponse.json({ error: "No pudimos guardar el proveedor habitual." }, { status: 500 });
}

async function readJson(request: Request): Promise<unknown | null> {
  try { return await request.json() as unknown; }
  catch { return null; }
}

async function requireManager() {
  const auth = await resolveAuthenticatedRouteContext();
  if (!canManageSupplierCatalog(auth.profile.rol)) {
    throw new AuthRouteAccessError(403, "Solo administradores y maestros pueden configurar el proveedor habitual.");
  }
  const organizationId = Number(auth.profile.organizationId);
  if (!Number.isSafeInteger(organizationId) || organizationId <= 0) {
    throw new AuthRouteAccessError(403, "No encontramos una organización activa.");
  }
  return { organizationId };
}

export async function GET() {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    const organizationId = Number(auth.profile.organizationId);
    const preferences = await listSupplierFamilyPreferences(organizationId);
    return NextResponse.json({ preferences }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return responseError(error); }
}

export async function PUT(request: Request) {
  try {
    const access = await requireManager();
    const parsed = putSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "La preferencia no es válida." }, { status: 400 });
    const { familyKey, providerKey } = parsed.data;
    if (!knownFamilyKeys().has(familyKey)) return NextResponse.json({ error: "La familia no está en el catálogo compatible." }, { status: 400 });

    const presentations = await readConfirmedSupplierPresentations(access.organizationId);
    if (!isSupplierProviderCompatibleWithFamily({ providerKey, familyKey, organizationId: access.organizationId, presentations })) {
      return NextResponse.json({ error: "Ese proveedor no tiene referencias confirmadas para esta familia." }, { status: 422 });
    }
    const preference = await upsertSupplierFamilyPreference({
      organizationId: access.organizationId,
      familyKey,
      providerKey,
    });
    return NextResponse.json({ preference }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return responseError(error); }
}

export async function DELETE(request: Request) {
  try {
    const access = await requireManager();
    const parsed = deleteSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "La familia no es válida." }, { status: 400 });
    if (!knownFamilyKeys().has(parsed.data.familyKey)) return NextResponse.json({ error: "La familia no está en el catálogo compatible." }, { status: 400 });
    await deleteSupplierFamilyPreference({ organizationId: access.organizationId, familyKey: parsed.data.familyKey });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return responseError(error); }
}
