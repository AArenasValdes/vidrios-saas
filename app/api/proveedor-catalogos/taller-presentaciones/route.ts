import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupplierCatalogDatabase } from "@/features/proveedor-catalogos/repositories/supplier-catalog-database.types";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { createWorkshopPresentation, listOfficialTechnicalInputsForFamily, listWorkshopPresentations, updateWorkshopPresentationPurchase, WorkshopPresentationConflictError, WorkshopPresentationsSchemaMissingError } from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";
import { buildQuickWorkshopPresentationKey, hasQuickWorkshopPresentationDuplicate, INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX, isGeneratedWorkshopPresentationKey } from "@/features/proveedor-catalogos/services/workshop-presentation-identity.service";
import { listWorkshopCatalogProfiles } from "@/features/proveedor-catalogos/services/workshop-presentation-catalog.service";
import { workshopPurchaseUnitSchema } from "@/features/proveedor-catalogos/schemas/workshop-presentation.schema";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  lineTemplateId: z.number().int().positive(),
  officialInputId: z.string().uuid().nullable(),
  technicalCode: z.string().trim().max(100).nullable(),
  recipeCode: z.string().trim().max(100).nullable(),
  profileName: z.string().trim().max(160).nullable(),
  workshopSku: z.string().trim().min(1).max(100).nullable().optional(),
  description: z.string().trim().min(1).max(240),
  finishName: z.string().trim().max(100).nullable(),
  purchaseUnit: workshopPurchaseUnitSchema,
  commercialLengthMm: z.number().int().positive().nullable(),
  netPrice: z.number().positive().nullable(),
  currency: z.enum(["CLP"]).nullable(),
  supplierName: z.string().trim().max(120).nullable().optional(),
  preferred: z.boolean(),
}).strict().refine((row) => Boolean(row.officialInputId || (row.technicalCode && row.profileName)), {
  message: "Selecciona un perfil oficial o define código y nombre privados.",
}).refine((row) => (row.netPrice === null) === (row.currency === null), {
  message: "El precio y la moneda deben completarse juntos.",
});

const updateSchema = z.object({
  lineTemplateId: z.number().int().positive(),
  presentationId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  purchaseUnit: workshopPurchaseUnitSchema,
  commercialLengthMm: z.number().int().positive().nullable(),
  netPrice: z.number().positive().nullable(),
  currency: z.enum(["CLP"]).nullable(),
  supplierName: z.string().trim().max(120).nullable().optional(),
  preferred: z.boolean().optional(),
}).strict().refine((row) => (row.netPrice === null) === (row.currency === null), {
  message: "El precio y la moneda deben completarse juntos.",
});

async function authorize(lineTemplateId: number) {
  const auth = await resolveAuthenticatedRouteContext();
  if (!canManageSupplierCatalog(auth.profile.rol)) {
    throw new AuthRouteAccessError(403, "Solo administradores y maestros pueden configurar perfiles y precios.");
  }
  const organizationId = Number(auth.profile.organizationId);
  const admin = createAdminClient() as unknown as SupabaseClient<SupplierCatalogDatabase>;
  const { data: line, error } = await admin.from("cotizacion_line_templates")
    .select("id, catalog_key").eq("id", lineTemplateId).eq("organization_id", organizationId)
    .is("eliminado_en", null).maybeSingle();
  if (error) throw new Error(error.message);
  const definition = VENTORA_DEFAULT_LINE_CATALOG.find((entry) => entry.catalogKey === line?.catalog_key);
  const familyKey = definition?.catalogMetadata?.familyKey;
  const configurationKey = definition?.catalogMetadata?.configurationKey;
  if (!line || !definition || typeof familyKey !== "string" || !familyKey.trim()) return null;
  return { organizationId, familyKey, catalogKey: definition.catalogKey, configurationKey: typeof configurationKey === "string" ? configurationKey : null, userId: auth.user.id };
}

function errorResponse(error: unknown) {
  if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof WorkshopPresentationsSchemaMissingError) return NextResponse.json({ error: error.message }, { status: 503 });
  if (error instanceof WorkshopPresentationConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  console.error("[API] presentaciones del taller", error);
  return NextResponse.json({ error: "No pudimos cargar las presentaciones del taller." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const lineTemplateId = Number(new URL(request.url).searchParams.get("lineTemplateId"));
    if (!Number.isSafeInteger(lineTemplateId) || lineTemplateId <= 0) return NextResponse.json({ error: "Línea inválida." }, { status: 400 });
    const access = await authorize(lineTemplateId);
    if (!access) return NextResponse.json({ error: "No disponible." }, { status: 404 });
    const [officialInputs, ownPresentations] = await Promise.all([
      listOfficialTechnicalInputsForFamily(access.familyKey),
      listWorkshopPresentations(access.organizationId, access.familyKey),
    ]);
    const catalogProfiles = listWorkshopCatalogProfiles(access.catalogKey ?? "");
    return NextResponse.json({
      familyKey: access.familyKey,
      officialInputs,
      catalogProfiles,
      ownPresentations: ownPresentations.map((row) => ({
        id: row.id, revision: row.revision, codigo_tecnico: row.codigo_tecnico,
        nombre_perfil: row.nombre_perfil, acabado_nombre: row.acabado_nombre,
        largo_comercial_mm: row.largo_comercial_mm, precio_neto: row.precio_neto,
        moneda: row.moneda, unidad_compra: row.unidad_compra, preferida: row.preferida,
        proveedor_nombre: row.proveedor_nombre ?? null,
        sku_taller: isGeneratedWorkshopPresentationKey(String(row.sku_taller)) ? null : row.sku_taller,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    const access = await authorize(parsed.data.lineTemplateId);
    if (!access) return NextResponse.json({ error: "No disponible." }, { status: 404 });
    const isPrivateCodedIdentity = !parsed.data.officialInputId && Boolean(parsed.data.technicalCode);
    const isQuickPrivateIdentity = isPrivateCodedIdentity && !parsed.data.workshopSku?.trim();
    if (isPrivateCodedIdentity && parsed.data.technicalCode) {
      const existing = await listWorkshopPresentations(access.organizationId, access.familyKey);
      const duplicate = hasQuickWorkshopPresentationDuplicate(existing, {
        configurationKey: access.configurationKey,
        technicalCode: parsed.data.technicalCode,
        finishName: parsed.data.finishName,
      });
      if (duplicate) return NextResponse.json({ error: "Ya existe un costo privado para este perfil y acabado. Edita esa referencia para evitar duplicados." }, { status: 409 });
    }
    const row = await createWorkshopPresentation({
      organizationId: access.organizationId,
      familyKey: access.familyKey,
      configurationKey: access.configurationKey,
      officialInputId: parsed.data.officialInputId,
      technicalCode: parsed.data.technicalCode,
      recipeCode: parsed.data.recipeCode,
      profileName: parsed.data.profileName,
      workshopSku: parsed.data.workshopSku?.trim() || (isQuickPrivateIdentity && parsed.data.technicalCode
        ? buildQuickWorkshopPresentationKey({
            organizationId: access.organizationId,
            familyKey: access.familyKey,
            configurationKey: access.configurationKey,
            technicalCode: parsed.data.technicalCode,
            finishName: parsed.data.finishName,
          })
        : `${INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX}${randomUUID()}`),
      description: parsed.data.description,
      finishName: parsed.data.finishName,
      purchaseUnit: parsed.data.purchaseUnit,
      commercialLengthMm: parsed.data.commercialLengthMm,
      netPrice: parsed.data.netPrice,
      currency: parsed.data.currency,
      supplierName: parsed.data.supplierName,
      preferred: parsed.data.preferred,
      userId: access.userId,
    });
    return NextResponse.json({
      row: { ...row, sku_taller: isGeneratedWorkshopPresentationKey(String(row.sku_taller)) ? null : row.sku_taller },
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    const access = await authorize(parsed.data.lineTemplateId);
    if (!access) return NextResponse.json({ error: "No disponible." }, { status: 404 });
    const row = await updateWorkshopPresentationPurchase({
      organizationId: access.organizationId, familyKey: access.familyKey,
      configurationKey: access.configurationKey, presentationId: parsed.data.presentationId,
      expectedRevision: parsed.data.expectedRevision, purchaseUnit: parsed.data.purchaseUnit,
      commercialLengthMm: parsed.data.commercialLengthMm, netPrice: parsed.data.netPrice,
      currency: parsed.data.currency,
      supplierName: parsed.data.supplierName,
      ...(parsed.data.preferred === undefined ? {} : { preferred: parsed.data.preferred }),
    });
    return NextResponse.json({ row }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
