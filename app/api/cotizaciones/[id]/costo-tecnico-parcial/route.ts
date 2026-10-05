import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { parseFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import {
  buildPartialTechnicalCostSnapshot,
  type TechnicalCostSnapshot,
} from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import {
  getExistingTechnicalCostSnapshot,
  persistTechnicalCostSnapshot,
  readOrganizationPurchasePricing,
  readSupplierPresentationPrices,
  readWorkshopPresentationPrices,
  readQuoteForTechnicalCost,
} from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { PriceListSelectionError } from "@/features/proveedor-catalogos/services/price-list-selection.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const explicitPriceListSelectionSchema = z.object({
  selectedPriceLists: z.record(z.string().trim().min(1), z.object({
    listId: z.string().uuid().optional(),
    revision: z.string().trim().min(1).optional(),
  }).refine((selection) => Boolean(selection.listId || selection.revision), "Indica listId o revision.")),
}).strict();

function parseQuoteId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function authorize() {
  const context = await resolveAuthenticatedRouteContext();
  return {
    organizationId: Number(context.profile.organizationId),
    role: context.profile.rol,
  };
}

export async function GET(_request: Request, route: RouteContext) {
  const quoteId = parseQuoteId((await route.params).id);
  if (!quoteId) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  let access: Awaited<ReturnType<typeof authorize>>;
  try {
    access = await authorize();
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API] costo técnico parcial auth", error);
    return NextResponse.json({ error: "No pudimos validar la organización activa." }, { status: 500 });
  }
  try {
    const quote = await readQuoteForTechnicalCost({ quoteId, organizationId: access.organizationId });
    if (!quote) return NextResponse.json({ error: "No encontramos esta cotización." }, { status: 404 });
    const workSnapshot = parseFabricacionTrabajoSnapshot(quote.workSnapshot);
    const existing = await getExistingTechnicalCostSnapshot({ quoteId, organizationId: access.organizationId });
    const hasSavedMaterialData = Boolean(workSnapshot && (
      workSnapshot.bars.length > 0 || (workSnapshot.missingPresentations?.length ?? 0) > 0
    ));
    return NextResponse.json({
      enabled: true,
      canConfigure: canManageSupplierCatalog(access.role),
      snapshot: existing?.snapshot ?? null,
      canCalculate: !existing && hasSavedMaterialData,
    });
  } catch (error) {
    console.error("[API] costo técnico parcial read", error);
    return NextResponse.json({ error: "No pudimos cargar el costo estimado de materiales." }, { status: 500 });
  }
}

export async function POST(request: Request, route: RouteContext) {
  const quoteId = parseQuoteId((await route.params).id);
  if (!quoteId) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  let access: Awaited<ReturnType<typeof authorize>>;
  try {
    access = await authorize();
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API] costo técnico parcial auth", error);
    return NextResponse.json({ error: "No pudimos validar la organización activa." }, { status: 500 });
  }
  try {
    const quote = await readQuoteForTechnicalCost({ quoteId, organizationId: access.organizationId });
    if (!quote) return NextResponse.json({ error: "No encontramos esta cotización." }, { status: 404 });

    const workSnapshot = parseFabricacionTrabajoSnapshot(quote.workSnapshot);
    if (!workSnapshot) {
      return NextResponse.json({ error: "Esta cotización no tiene una pauta conjunta histórica para valorar." }, { status: 422 });
    }
    const existing = await getExistingTechnicalCostSnapshot({ quoteId, organizationId: access.organizationId });
    if (existing) return NextResponse.json({ snapshot: existing.snapshot, persisted: true });

    const bodyText = await request.text();
    let selectedPriceLists: z.infer<typeof explicitPriceListSelectionSchema>["selectedPriceLists"] | undefined;
    if (bodyText.trim()) {
      let body: unknown;
      try { body = JSON.parse(bodyText) as unknown; }
      catch { return NextResponse.json({ error: "La selección de listas no es válida." }, { status: 400 }); }
      const parsedBody = explicitPriceListSelectionSchema.safeParse(body);
      if (!parsedBody.success) return NextResponse.json({ error: "La selección de listas no es válida." }, { status: 400 });
      selectedPriceLists = parsedBody.data.selectedPriceLists;
    }
    const [supplierPrices, workshopPrices] = await Promise.all([
      readSupplierPresentationPrices({ selectedByProvider: selectedPriceLists }),
      readWorkshopPresentationPrices(access.organizationId),
    ]);
    const prices = [...supplierPrices, ...workshopPrices];
    const organizationPricing = await readOrganizationPurchasePricing({
      organizationId: access.organizationId,
      providerKeys: [...new Set(prices.map((price) => price.providerKey).filter((providerKey): providerKey is string => Boolean(providerKey)))],
      presentationIds: prices.flatMap((price) => price.presentationId ? [price.presentationId] : []),
    });
    const snapshot = buildPartialTechnicalCostSnapshot({
      workSnapshot,
      quoteItems: quote.items,
      availablePrices: prices,
      organizationPricing,
    });
    if (!snapshot) return NextResponse.json({ error: "No hay cortes técnicos guardados para calcular." }, { status: 422 });

    const persisted = await persistTechnicalCostSnapshot({
      quoteId,
      organizationId: access.organizationId,
      snapshot: snapshot as TechnicalCostSnapshot,
    });
    return NextResponse.json({ snapshot: persisted.snapshot, persisted: true });
  } catch (error) {
    if (error instanceof PriceListSelectionError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[API] costo técnico parcial calculate", error);
    return NextResponse.json({ error: "No pudimos congelar el costo técnico parcial." }, { status: 500 });
  }
}

