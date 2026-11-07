import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupplierCatalogDatabase } from "@/features/proveedor-catalogos/repositories/supplier-catalog-database.types";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { createWorkshopPresentation, listOfficialTechnicalInputsForFamily, listWorkshopPresentations, updateWorkshopPresentationPurchase, WorkshopPresentationsSchemaMissingError } from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";
import { INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX, isGeneratedWorkshopPresentationKey } from "@/features/proveedor-catalogos/services/workshop-presentation-identity.service";

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
  purchaseUnit: z.enum(["M", "UN", "KG", "PAR"]),
  commercialLengthMm: z.number().int().positive().nullable(),
  netPrice: z.number().positive().nullable(),
  currency: z.enum(["CLP"]).nullable(),
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
  purchaseUnit: z.enum(["M", "UN", "KG", "PAR"]),
  commercialLengthMm: z.number().int().positive().nullable(),
  netPrice: z.number().positive().nullable(),
  currency: z.enum(["CLP"]).nullable(),
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
  if (!line || !definition || typeof familyKey !== "string" ||
    (!familyKey.startsWith("veratec:") && !familyKey.startsWith("thermowin:") &&
      !(definition.catalogKey === "ventora:l25" && familyKey === "universal:aluminio:l25"))) return null;
  return { organizationId, familyKey, catalogKey: definition.catalogKey, configurationKey: typeof configurationKey === "string" ? configurationKey : null, userId: auth.user.id };
}

function errorResponse(error: unknown) {
  if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof WorkshopPresentationsSchemaMissingError) return NextResponse.json({ error: error.message }, { status: 503 });
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
    const catalogProfiles = access.familyKey.startsWith("thermowin:")
      ? getVentoraProfileReferencesForCatalogKey(access.catalogKey)?.profiles
          .filter((profile) => profile.code && profile.codeStatus === "catalog_reference")
          .map((profile) => ({ code: profile.code, name: profile.name, role: profile.role })) ?? []
      : [];
    return NextResponse.json({
      familyKey: access.familyKey,
      officialInputs,
      catalogProfiles,
      ownPresentations: ownPresentations.map((row) => ({
        ...row,
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
    if (access.catalogKey === "ventora:l25" && !parsed.data.officialInputId) {
      const existing = await listWorkshopPresentations(access.organizationId, access.familyKey);
      const normalize = (value: string | null | undefined) => (value ?? "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
      const duplicate = existing.some((row) =>
        String(row.configuration_key ?? "") === (access.configurationKey ?? "") &&
        String(row.codigo_tecnico).trim().toLocaleUpperCase("en-US") === parsed.data.technicalCode?.trim().toLocaleUpperCase("en-US") &&
        normalize(String(row.acabado_nombre ?? "")) === normalize(parsed.data.finishName)
      );
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
      workshopSku: parsed.data.workshopSku?.trim() || `${INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX}${randomUUID()}`,
      description: parsed.data.description,
      finishName: parsed.data.finishName,
      purchaseUnit: parsed.data.purchaseUnit,
      commercialLengthMm: parsed.data.commercialLengthMm,
      netPrice: parsed.data.netPrice,
      currency: parsed.data.currency,
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
      ...(parsed.data.preferred === undefined ? {} : { preferred: parsed.data.preferred }),
    });
    return NextResponse.json({ row }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
