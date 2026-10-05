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
import {
  getSupplierCatalogQaConfig,
  matchesConfiguredPilotQuoteItems,
  isQuoteEligibleForFirstSupplierCostSnapshot,
} from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { validateQaPreliminaryQuoteSnapshots } from "@/features/proveedor-catalogos/services/qa-preliminary-snapshot.service";
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

function isValidatedRecipeSnapshot(snapshot: unknown) {
  return Boolean(
    snapshot &&
    typeof snapshot === "object" &&
    !Array.isArray(snapshot) &&
    (snapshot as Record<string, unknown>).recipeStatus === "validated"
  );
}

function hasOnlyValidatedRecipes(quote: NonNullable<Awaited<ReturnType<typeof readQuoteForTechnicalCost>>>) {
  return quote.items.length > 0 && quote.items.every((item) => isValidatedRecipeSnapshot(item.fabricacionSnapshot));
}

function validateQuoteRecipeSnapshots(
  quote: Awaited<ReturnType<typeof readQuoteForTechnicalCost>>,
  workSnapshot: ReturnType<typeof parseFabricacionTrabajoSnapshot>,
  access: Extract<Awaited<ReturnType<typeof authorize>>, { organizationId: number }>
) {
  if (!quote) return { allowed: false as const, reason: "No encontramos esta cotización." };
  return validateQaPreliminaryQuoteSnapshots({
    workSnapshot,
    organizationId: access.organizationId,
    role: access.role,
    userEmail: access.userEmail,
    config: access.config,
    items: quote.items.map((item) => {
      const raw = item.fabricacionSnapshot;
      const snapshot = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw as {
            recipeId?: string | null;
            recipeVersion?: number | null;
            recipeStatus?: string | null;
            selectedVariant?: string | null;
            qaPreliminary?: unknown;
          }
        : null;
      return { itemId: item.id, snapshot };
    }),
  });
}

async function authorize() {
  const context = await resolveAuthenticatedRouteContext();
  const config = getSupplierCatalogQaConfig();
  return {
    organizationId: Number(context.profile.organizationId),
    config,
    role: context.profile.rol,
    userEmail: context.user.email,
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
    if (!matchesConfiguredPilotQuoteItems(quote.items, access.config)) {
      return NextResponse.json({ enabled: false }, { status: 404 });
    }
    const workSnapshot = parseFabricacionTrabajoSnapshot(quote.workSnapshot);
    const snapshotCheck = validateQuoteRecipeSnapshots(quote, workSnapshot, access);
    if (!snapshotCheck.allowed) {
      return NextResponse.json({ error: snapshotCheck.reason }, { status: 409 });
    }
    const existing = await getExistingTechnicalCostSnapshot({ quoteId, organizationId: access.organizationId });
    const allRecipesValidated = hasOnlyValidatedRecipes(quote);
    return NextResponse.json({
      enabled: true,
      canConfigure: canManageSupplierCatalog(access.role),
      snapshot: existing?.snapshot ?? null,
      canCalculate: !existing && (allRecipesValidated || isQuoteEligibleForFirstSupplierCostSnapshot({ quoteCreatedAt: quote.createdAt, config: access.config })),
    });
  } catch (error) {
    console.error("[API] costo técnico parcial read", error);
    return NextResponse.json({ error: "No pudimos cargar el costo técnico de QA." }, { status: 500 });
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
    if (!matchesConfiguredPilotQuoteItems(quote.items, access.config)) {
      return NextResponse.json({ error: "El costo técnico no está habilitado para esta línea." }, { status: 404 });
    }

    const workSnapshot = parseFabricacionTrabajoSnapshot(quote.workSnapshot);
    if (!workSnapshot) {
      return NextResponse.json({ error: "Esta cotización no tiene una pauta conjunta histórica para valorar." }, { status: 422 });
    }
    const snapshotCheck = validateQuoteRecipeSnapshots(quote, workSnapshot, access);
    if (!snapshotCheck.allowed) {
      return NextResponse.json({ error: snapshotCheck.reason }, { status: 409 });
    }

    const existing = await getExistingTechnicalCostSnapshot({ quoteId, organizationId: access.organizationId });
    if (existing) return NextResponse.json({ snapshot: existing.snapshot, persisted: true });
    const allRecipesValidated = hasOnlyValidatedRecipes(quote);
    if (!allRecipesValidated && !isQuoteEligibleForFirstSupplierCostSnapshot({ quoteCreatedAt: quote.createdAt, config: access.config })) {
      return NextResponse.json({ error: "El cálculo inicial está limitado a cotizaciones nuevas del piloto QA." }, { status: 409 });
    }

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

