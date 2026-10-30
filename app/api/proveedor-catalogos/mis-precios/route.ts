import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { canManageSupplierCatalog, canReadSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { resolvePurchasePrice } from "@/features/proveedor-catalogos/services/precio-compra.service";
import { readConfirmedSupplierPresentations, readOrganizationPurchasePricing } from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { readMisPreciosReferenceCatalog } from "@/features/proveedor-catalogos/services/mis-precios-reference-catalog.service";
import { clearPresentationOverride, savePresentationOverride, saveSupplierAdjustment } from "@/features/proveedor-catalogos/repositories/precios-compra-organizacion.repository";

// Authentication makes this route dynamic. Do not force all fetches to bypass
// the explicit cache of the shared catalog; the response itself is never cached.

const changeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("adjustment"), providerKey: z.string().trim().min(1), percentage: z.number().finite().gt(-100).lte(1000) }),
  z.object({ kind: z.literal("override"), providerKey: z.string().trim().min(1), presentationId: z.uuid(), netPrice: z.number().finite().positive(), currency: z.string().regex(/^[A-Z]{3}$/) }),
  z.object({
    kind: z.literal("quote_override"), providerKey: z.string().trim().min(1), presentationId: z.uuid(),
    familyKey: z.string().trim().min(1), technicalCode: z.string().trim().min(1), finishName: z.string().trim().min(1),
    netPrice: z.number().finite().positive(), currency: z.string().regex(/^[A-Z]{3}$/),
  }),
  z.object({ kind: z.literal("clear_override"), providerKey: z.string().trim().min(1), presentationId: z.uuid() }),
]);

async function context() {
  const auth = await resolveAuthenticatedRouteContext();
  if (!canReadSupplierCatalog(auth.profile.organizationId)) return null;
  return { organizationId: Number(auth.profile.organizationId), role: auth.profile.rol };
}

function failure(error: unknown) {
  if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[API] mis precios", error);
  return NextResponse.json({ error: "No pudimos cargar o guardar tus precios." }, { status: 500 });
}

function normalizeIdentity(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

export async function GET() {
  const startedAt = performance.now();
  try {
    const access = await context();
    const authenticatedAt = performance.now();
    if (!access) return NextResponse.json({ error: "No disponible." }, { status: 404 });
    const referenceCatalog = await readMisPreciosReferenceCatalog();
    const { presentations } = referenceCatalog;
    const providerNames = new Map(referenceCatalog.providerNames);
    const catalogReadAt = performance.now();
    const providerKeys = [...new Set(presentations.map((row) => row.providerKey).filter((key): key is string => Boolean(key)))];
    const pricing = await readOrganizationPurchasePricing({
      organizationId: access.organizationId,
      providerKeys,
      presentationIds: presentations.flatMap((row) => row.presentationId ? [row.presentationId] : []),
    });
    const pricingReadAt = performance.now();
    const catalogPresentationsById = new Map(presentations.map((presentation) => [presentation.presentationId, presentation]));
    const presentationsByProvider = new Map<string, typeof presentations>();
    for (const presentation of presentations) {
      if (!presentation.providerKey) continue;
      const rows = presentationsByProvider.get(presentation.providerKey) ?? [];
      rows.push(presentation);
      presentationsByProvider.set(presentation.providerKey, rows);
    }
    const adjustmentsByProvider = new Map(pricing.adjustments
      .filter((row) => row.active)
      .map((row) => [row.providerKey, row.percentage] as const));
    const overridesByPresentation = new Map(pricing.overrides
      .filter((row): row is typeof row & { presentationId: string } => Boolean(row.presentationId))
      .map((row) => [row.presentationId, row.netPrice] as const));
    const providers = providerKeys.map((providerKey) => {
      const rows = presentationsByProvider.get(providerKey) ?? [];
      return {
        providerKey,
        providerName: providerNames.get(providerKey) ?? providerKey,
        revision: rows[0]?.priceListRevision ?? "",
        priceListStatus: rows[0]?.priceReferenceStatus,
        publishedOn: rows[0]?.priceListPublishedOn ?? null,
        sourceQuotationValidUntil: providerKey === "alumco" ? rows[0]?.priceListValidUntil ?? null : null,
        percentage: adjustmentsByProvider.get(providerKey) ?? 0,
        presentations: rows.map((row) => {
          const catalogRow = catalogPresentationsById.get(row.presentationId);
          return ({
            presentationId: row.presentationId,
            familyKeys: row.familyKeys ?? [],
            technicalCodes: [...new Set([
              catalogRow?.technicalCode,
              ...(catalogRow?.recipeComponentCodes ?? []),
              row.supplierSku,
            ].filter((code): code is string => Boolean(code?.trim())))],
            sku: row.supplierSku,
            supplierSku: providerKey === "arquetipo" && catalogRow?.technicalCode === row.supplierSku && row.netPrice == null
              ? null
              : row.supplierSku,
            name: row.presentationDescription,
            finish: row.finishName,
            purchaseUnit: row.purchaseUnit,
            commercialLengthMm: row.commercialLengthMm,
            referenceNetPrice: row.netPrice,
            currency: row.currency,
            ownNetPrice: row.presentationId ? overridesByPresentation.get(row.presentationId) ?? null : null,
            effective: resolvePurchasePrice({
              providerKey,
              presentationId: row.presentationId ?? row.supplierSku,
              referenceNetPrice: row.netPrice,
              referenceBasis: row.priceBasis,
              referenceCurrency: row.currency,
              commercialLengthMm: row.commercialLengthMm,
              organizationPricing: pricing,
            }),
          });
        }),
      };
    });
    const timing = `auth;dur=${(authenticatedAt - startedAt).toFixed(1)}, catalog;dur=${(catalogReadAt - authenticatedAt).toFixed(1)}, pricing;dur=${(pricingReadAt - catalogReadAt).toFixed(1)}, serialize;dur=${(performance.now() - pricingReadAt).toFixed(1)}`;
    if (process.env.NODE_ENV === "development") console.info(`[mis-precios:timing] ${timing}`);
    return NextResponse.json({ providers }, { headers: { "Server-Timing": timing, "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const access = await context();
    if (!access) return NextResponse.json({ error: "No disponible." }, { status: 404 });
    if (!canManageSupplierCatalog(access.role)) return NextResponse.json({ error: "Solo administradores y maestros pueden cambiar precios de compra." }, { status: 403 });
    const parsed = changeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisa el proveedor, porcentaje o precio ingresado." }, { status: 400 });
    const change = parsed.data;
    if (change.kind === "adjustment") await saveSupplierAdjustment({ organizationId: access.organizationId, providerKey: change.providerKey, percentage: change.percentage });
    else if (change.kind === "quote_override") {
      const presentations = await readConfirmedSupplierPresentations(access.organizationId);
      const match = presentations.find((presentation) =>
        presentation.presentationId === change.presentationId &&
        presentation.providerKey === change.providerKey &&
        presentation.familyKeys.includes(change.familyKey) &&
        presentation.technicalCode.trim().toLocaleUpperCase("en-US") === change.technicalCode.trim().toLocaleUpperCase("en-US") &&
        presentation.commercialLengthMm != null && presentation.commercialLengthMm > 0 &&
        (presentation.finishResolution === "finish_independent" ||
          Boolean(presentation.finishName && normalizeIdentity(presentation.finishName) === normalizeIdentity(change.finishName)))
      );
      if (!match) return NextResponse.json({ error: "No se pudo confirmar el perfil, acabado y presentación para guardar este precio." }, { status: 400 });
      await savePresentationOverride({
        organizationId: access.organizationId,
        providerKey: change.providerKey,
        presentationId: change.presentationId,
        netPrice: change.netPrice,
        currency: change.currency,
      });
    }
    else if (change.kind === "override") await savePresentationOverride({
      organizationId: access.organizationId,
      providerKey: change.providerKey,
      presentationId: change.presentationId,
      netPrice: change.netPrice,
      currency: change.currency,
    });
    else await clearPresentationOverride({ organizationId: access.organizationId, providerKey: change.providerKey, presentationId: change.presentationId });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
