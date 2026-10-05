import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { getSupplierCatalogQaConfig, isSupplierCatalogQaEnabledForIdentity } from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";
import { resolvePurchasePrice } from "@/features/proveedor-catalogos/services/precio-compra.service";
import { readOrganizationPurchasePricing, readSupplierNames, readSupplierPresentationPrices } from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { clearPresentationOverride, savePresentationOverride, saveSupplierAdjustment } from "@/features/proveedor-catalogos/repositories/precios-compra-organizacion.repository";

export const dynamic = "force-dynamic";

const changeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("adjustment"), providerKey: z.string().trim().min(1), percentage: z.number().finite().gt(-100).lte(1000) }),
  z.object({ kind: z.literal("override"), providerKey: z.string().trim().min(1), presentationId: z.uuid(), netPrice: z.number().finite().positive(), currency: z.string().regex(/^[A-Z]{3}$/) }),
  z.object({ kind: z.literal("clear_override"), providerKey: z.string().trim().min(1), presentationId: z.uuid() }),
]);

async function context() {
  if (process.env.SUPPLIER_CATALOG_ORG_PRICES_ENABLED !== "true") return null;
  const auth = await resolveAuthenticatedRouteContext();
  const config = getSupplierCatalogQaConfig();
  if (!isSupplierCatalogQaEnabledForIdentity({
    organizationId: auth.profile.organizationId,
    role: auth.profile.rol,
    userEmail: auth.user.email,
    config,
  })) return null;
  return { organizationId: Number(auth.profile.organizationId) };
}

function failure(error: unknown) {
  if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[API] mis precios", error);
  return NextResponse.json({ error: "No pudimos cargar o guardar tus precios." }, { status: 500 });
}

export async function GET() {
  try {
    const access = await context();
    if (!access) return NextResponse.json({ error: "No disponible." }, { status: 404 });
    const presentations = await readSupplierPresentationPrices();
    const providerKeys = [...new Set(presentations.map((row) => row.providerKey).filter((key): key is string => Boolean(key)))];
    const pricing = await readOrganizationPurchasePricing({
      organizationId: access.organizationId,
      providerKeys,
      presentationIds: presentations.flatMap((row) => row.presentationId ? [row.presentationId] : []),
    });
    const providerNames = await readSupplierNames(providerKeys);
    const providers = providerKeys.map((providerKey) => {
      const rows = presentations.filter((row) => row.providerKey === providerKey);
      return {
        providerKey,
        providerName: providerNames.get(providerKey) ?? providerKey,
        revision: rows[0]?.priceListRevision ?? "",
        percentage: pricing.adjustments.find((row) => row.providerKey === providerKey && row.active)?.percentage ?? 0,
        presentations: rows.map((row) => ({
          presentationId: row.presentationId,
          familyKeys: row.familyKeys ?? [],
          sku: row.supplierSku,
          name: row.presentationDescription,
          finish: row.finishName,
          purchaseUnit: row.purchaseUnit,
          commercialLengthMm: row.commercialLengthMm,
          referenceNetPrice: row.netPrice,
          currency: row.currency,
          ownNetPrice: pricing.overrides.find((entry) => entry.presentationId === row.presentationId)?.netPrice ?? null,
          effective: resolvePurchasePrice({
            providerKey,
            presentationId: row.presentationId ?? row.supplierSku,
            referenceNetPrice: row.netPrice,
            referenceBasis: row.priceBasis,
            referenceCurrency: row.currency,
            commercialLengthMm: row.commercialLengthMm,
            organizationPricing: pricing,
          }),
        })),
      };
    });
    return NextResponse.json({ providers });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const access = await context();
    if (!access) return NextResponse.json({ error: "No disponible." }, { status: 404 });
    const parsed = changeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisa el proveedor, porcentaje o precio ingresado." }, { status: 400 });
    const change = parsed.data;
    if (change.kind === "adjustment") await saveSupplierAdjustment({ organizationId: access.organizationId, providerKey: change.providerKey, percentage: change.percentage });
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
