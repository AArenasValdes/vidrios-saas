import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { listSupplierFamilyPreferences } from "@/features/proveedor-catalogos/repositories/supplier-family-preferences.repository";
import {
  readConfirmedSupplierPresentations,
  readSupplierNames,
  readSupplierPresentationPrices,
  readWorkshopPresentationPrices,
} from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { getSupplierCatalogQuoteLineKeys } from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";
import {
  resolveSupplierPresentationsForQuoteItem,
  resolveSupplierPriceProviderCoverage,
  isSupplierProviderCompatibleWithFamily,
  resolveEffectiveSupplierProviderKey,
} from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().trim().min(1).max(100),
    catalogLineKey: z.string().trim().min(1).max(180),
    familyKey: z.string().trim().min(1).max(180),
    finishName: z.string().trim().max(100).nullable(),
    technicalCodes: z.array(z.string().trim().min(1).max(100)).max(100),
    providerKey: z.string().trim().min(1).max(100).nullable().optional(),
  })).max(100),
  includeProviderOptions: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    const supportedCatalogLineKeys = getSupplierCatalogQuoteLineKeys();
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "La solicitud de presentaciones no es válida." }, { status: 400 });
    const familyByCatalogLineKey = new Map(VENTORA_DEFAULT_LINE_CATALOG.flatMap((line) => {
      const familyKey = line.catalogMetadata?.familyKey;
      return line.catalogKey && typeof familyKey === "string" ? [[line.catalogKey, familyKey] as const] : [];
    }));
    const itemErrors: Record<string, string> = {};
    const validItems = parsed.data.items.filter((item) => {
      const isSupported = supportedCatalogLineKeys.has(item.catalogLineKey) &&
        familyByCatalogLineKey.get(item.catalogLineKey) === item.familyKey;
      if (!isSupported) {
        itemErrors[item.itemId] = "Esta línea todavía no tiene una familia de compra configurada.";
      }
      return isSupported;
    });

    if (validItems.length === 0) {
      return NextResponse.json({ enabled: true, selections: {}, providerOptions: {}, familyPreferences: {}, itemErrors });
    }

    const organizationId = Number(auth.profile.organizationId);
    const [presentations, savedPreferences] = await Promise.all([
      readConfirmedSupplierPresentations(organizationId),
      listSupplierFamilyPreferences(organizationId),
    ]);
    const preferenceByFamily = new Map(savedPreferences.map((preference) => [preference.familyKey, preference.providerKey]));
    const requestedFamilies = [...new Set(validItems.map((item) => item.familyKey))];
    const familyPreferences = Object.fromEntries(requestedFamilies.flatMap((familyKey) => {
      const providerKey = preferenceByFamily.get(familyKey);
      return providerKey ? [[familyKey, providerKey] as const] : [];
    }));
    let providerOptions: Record<string, Array<{
      providerKey: string;
      label: string;
      pricedProfileCount: number;
      totalProfileCount: number;
      isReference: boolean;
    }>> = {};
    if (parsed.data.includeProviderOptions) {
      const [catalogPrices, workshopPrices] = await Promise.all([
        readSupplierPresentationPrices(),
        readWorkshopPresentationPrices(organizationId),
      ]);
      const priceRows = [...catalogPrices, ...workshopPrices];
      const providerKeys = [...new Set([
        ...presentations.map((presentation) => presentation.providerKey),
        ...priceRows.map((row) => row.providerKey).filter((key): key is string => Boolean(key)),
        ...validItems.flatMap((item) => [item.providerKey, preferenceByFamily.get(item.familyKey)].filter((key): key is string => Boolean(key))),
      ])];
      const providerNames = await readSupplierNames(providerKeys.filter((key) => !key.startsWith("taller:")));
      providerOptions = Object.fromEntries(validItems.map((item) => {
        const configurationKey = VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === item.catalogLineKey)?.catalogMetadata?.configurationKey as string | undefined;
        const coverage = resolveSupplierPriceProviderCoverage({
          request: { ...item, configurationKey },
          presentations: priceRows,
        });
        const compatibleProviderKeys = providerKeys.filter((providerKey) =>
          isSupplierProviderCompatibleWithFamily({ providerKey, familyKey: item.familyKey, organizationId, presentations })
        );
        const visibleProviderKeys = new Set([
          ...compatibleProviderKeys,
          ...(item.providerKey ? [item.providerKey] : []),
          ...(preferenceByFamily.get(item.familyKey) ? [preferenceByFamily.get(item.familyKey) as string] : []),
        ]);
        const coverageByProvider = new Map(coverage.map((option) => [option.providerKey, option]));
        const options = [...visibleProviderKeys].map((providerKey) => {
          const priced = coverageByProvider.get(providerKey);
          return {
            providerKey,
            label: providerKey.startsWith("taller:") ? "Precio propio del taller" : providerNames.get(providerKey) ?? providerKey,
            pricedProfileCount: priced?.pricedProfileCount ?? 0,
            totalProfileCount: priced?.totalProfileCount ?? item.technicalCodes.length,
            isReference: priced?.isReference ?? providerKey === "arquetipo",
          };
        }).sort((left, right) => Number(right.isReference) - Number(left.isReference) || left.label.localeCompare(right.label, "es-CL"));
        return [item.itemId, options] as const;
      }));
    }
    const selections = Object.fromEntries(validItems.map((item) => [item.itemId,
      resolveSupplierPresentationsForQuoteItem({
        request: {
          ...item,
          providerKey: resolveEffectiveSupplierProviderKey({
            explicitProviderKey: item.providerKey,
            familyPreferenceProviderKey: preferenceByFamily.get(item.familyKey),
          }),
          configurationKey: VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === item.catalogLineKey)?.catalogMetadata?.configurationKey as string | undefined,
        },
        presentations,
      }),
    ]));
    return NextResponse.json({
      enabled: true,
      selections,
      providerOptions,
      familyPreferences,
      itemErrors,
      canManageFamilyPreferences: canManageSupplierCatalog(auth.profile.rol),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) return NextResponse.json({ enabled: false }, { status: error.status });
    console.error("[API] resolver presentaciones proveedor", error);
    return NextResponse.json({ error: "No pudimos resolver las presentaciones comerciales." }, { status: 500 });
  }
}
