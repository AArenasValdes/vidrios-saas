import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { listSupplierFamilyPreferences } from "@/features/proveedor-catalogos/repositories/supplier-family-preferences.repository";
import {
  readConfirmedSupplierPresentations,
  readOrganizationPurchasePricing,
  readSupplierNames,
  readSupplierPresentationPrices,
  readWorkshopPresentationPrices,
} from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { getSupplierCatalogQuoteLineKeys } from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";
import {
  resolveSupplierPresentationsForQuoteItem,
  resolveSupplierProfilePricePreviews,
  resolveSupplierPriceProviderCoverage,
  isSupplierProviderCompatibleWithFamily,
  resolveEffectiveSupplierProviderKey,
} from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { normalizeUniversalAluminumFamilyKey, VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { getLineTemplateWorkshopProfiles } from "@/features/cotizaciones/line-templates/types/line-profile-references";

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
  includeProfilePrices: z.boolean().optional(),
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
    const supplierFamilyKeys = [...new Set(validItems.flatMap(({ familyKey }) => {
      const normalized = normalizeUniversalAluminumFamilyKey(familyKey);
      const aliases = normalized?.startsWith("universal:aluminio:l")
        ? [`arquetipo:l${normalized.slice("universal:aluminio:l".length)}`]
        : [];
      return [familyKey, ...(normalized ? [normalized] : []), ...aliases];
    }))];
    const [presentations, savedPreferences, catalogPrices, workshopPrices] = await Promise.all([
      readConfirmedSupplierPresentations(organizationId, { familyKeys: supplierFamilyKeys }),
      listSupplierFamilyPreferences(organizationId),
      parsed.data.includeProviderOptions ? readSupplierPresentationPrices({ familyKeys: supplierFamilyKeys }) : Promise.resolve([]),
      parsed.data.includeProviderOptions ? readWorkshopPresentationPrices(organizationId) : Promise.resolve([]),
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
      otherAvailableFinishNames?: string[];
    }>> = {};
    let profilePrices: Record<string, ReturnType<typeof resolveSupplierProfilePricePreviews>> = {};
    if (parsed.data.includeProviderOptions) {
      const priceRows = [...catalogPrices, ...workshopPrices];
      const providerKeys = [...new Set([
        ...presentations.map((presentation) => presentation.providerKey),
        ...priceRows.map((row) => row.providerKey).filter((key): key is string => Boolean(key)),
        ...validItems.flatMap((item) => [item.providerKey, preferenceByFamily.get(item.familyKey)].filter((key): key is string => Boolean(key))),
      ])];
      const lineByKey = new Map(VENTORA_DEFAULT_LINE_CATALOG.map((line) => [line.catalogKey, line]));
      const candidateItems = validItems.map((item) => {
        const line = lineByKey.get(item.catalogLineKey);
        const metadata = line?.catalogMetadata;
        const refs = getLineTemplateWorkshopProfiles(metadata)?.profiles ?? [];
        return {
          item,
          refs: refs.filter((profile) => profile.codeStatus === "catalog_reference" && profile.code?.trim())
            .map((profile) => ({ code: profile.code!, name: profile.name })),
        };
      });
      const codeSet = new Set(candidateItems.flatMap(({ item, refs }) => [
        ...item.technicalCodes.map((code) => code.trim().toLocaleUpperCase("en-US")),
        ...refs.map((profile) => profile.code.trim().toLocaleUpperCase("en-US")),
      ]));
      const relevantPriceRows = priceRows.filter((row) =>
        Boolean(row.technicalCode && codeSet.has(row.technicalCode.trim().toLocaleUpperCase("en-US"))) ||
        (row.recipeComponentCodes ?? []).some((code) => codeSet.has(code.trim().toLocaleUpperCase("en-US")))
      );
      const normalizedFamilyKeys = new Set(validItems.map((item) => item.familyKey.toLocaleLowerCase("es-CL")));
      const profilePriceCandidates = relevantPriceRows.filter((row) =>
        row.technicalCode && codeSet.has(row.technicalCode.trim().toLocaleUpperCase("en-US")) &&
        (row.familyKeys ?? []).some((key) => normalizedFamilyKeys.has(key.toLocaleLowerCase("es-CL")))
      );
      const includeProfilePrices = parsed.data.includeProfilePrices !== false;
      const [providerNames, organizationPricing] = await Promise.all([
        readSupplierNames(providerKeys.filter((key) => !key.startsWith("taller:"))),
        includeProfilePrices ? readOrganizationPurchasePricing({
          organizationId,
          providerKeys: [...new Set(profilePriceCandidates.map((row) => row.providerKey).filter((key): key is string => Boolean(key)))],
          presentationIds: [...new Set(profilePriceCandidates.map((row) => row.presentationId).filter((id): id is string => Boolean(id)))],
        }) : Promise.resolve({ adjustments: [], overrides: [] }),
      ]);
      const displayProviderNames = new Map(providerKeys.filter((key) => !key.startsWith("taller:")).map((providerKey) => [
        providerKey,
        providerKey === "arquetipo"
          ? "Arquetipo · junio 2026"
          : providerKey === "alumco"
            ? "Alumco · 2026"
            : (providerNames.get(providerKey) ?? providerKey).replace(/^Distribuidora\s+/i, "").trim(),
      ] as const));
      profilePrices = includeProfilePrices ? Object.fromEntries(candidateItems.map(({ item, refs }) => {
        const line = lineByKey.get(item.catalogLineKey);
        const requestItem = {
          ...item,
          configurationKey: line?.catalogMetadata?.configurationKey as string | undefined,
        };
        return [item.itemId, resolveSupplierProfilePricePreviews({
          request: requestItem,
          references: refs,
          presentations: profilePriceCandidates,
          providerNames: new Map([...displayProviderNames, ...[...providerKeys].filter((key) => key.startsWith("taller:")).map((key) => [key, "Precio propio del taller"] as const)]),
          organizationPricing,
        })] as const;
      })) : {};
      providerOptions = Object.fromEntries(validItems.map((item) => {
        const configurationKey = VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === item.catalogLineKey)?.catalogMetadata?.configurationKey as string | undefined;
        const coverage = resolveSupplierPriceProviderCoverage({
          request: { ...item, configurationKey },
          presentations: relevantPriceRows,
        });
        const normalizedCurrentFinish = item.finishName?.trim().toLocaleLowerCase("es-CL") ?? "";
        const normalizedFamilyKey = (normalizeUniversalAluminumFamilyKey(item.familyKey) ?? item.familyKey).toLocaleLowerCase("es-CL");
        const requestedCodes = new Set(item.technicalCodes.map((code) => code.trim().toLocaleUpperCase("en-US")));
        const finishNames = [...new Set(relevantPriceRows.flatMap((row) => {
          const familyMatches = (row.familyKeys ?? []).some((familyKey) =>
            (normalizeUniversalAluminumFamilyKey(familyKey) ?? familyKey).toLocaleLowerCase("es-CL") === normalizedFamilyKey
          );
          const configurationMatches = !row.configurationKey || row.configurationKey === configurationKey;
          const codesMatch = Boolean(row.technicalCode && requestedCodes.has(row.technicalCode.trim().toLocaleUpperCase("en-US"))) ||
            (row.recipeComponentCodes ?? []).some((code) => requestedCodes.has(code.trim().toLocaleUpperCase("en-US")));
          return familyMatches && configurationMatches && codesMatch && row.finishResolution === "specific" && row.finishName?.trim()
            ? [row.finishName.trim()]
            : [];
        }))].filter((finishName) => finishName.toLocaleLowerCase("es-CL") !== normalizedCurrentFinish);
        const otherAvailableFinishNamesByProvider = new Map<string, Set<string>>();
        for (const finishName of finishNames) {
          const finishCoverage = resolveSupplierPriceProviderCoverage({
            request: { ...item, configurationKey, finishName },
            presentations: relevantPriceRows,
          });
          for (const finishOption of finishCoverage) {
            if (finishOption.pricedProfileCount === 0) continue;
            const availableFinishes = otherAvailableFinishNamesByProvider.get(finishOption.providerKey) ?? new Set<string>();
            availableFinishes.add(finishName);
            otherAvailableFinishNamesByProvider.set(finishOption.providerKey, availableFinishes);
          }
        }
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
          const rawProviderName = providerKey.startsWith("taller:") ? "Precio propio del taller" : providerNames.get(providerKey) ?? providerKey;
          const providerName = displayProviderNames.get(providerKey) ?? rawProviderName.replace(/^Distribuidora\s+/i, "").trim();
          const revisions = relevantPriceRows
            .filter((row) => row.providerKey === providerKey)
            .map((row) => row.priceListRevision.match(/20\d{2}/)?.[0] ?? null)
            .filter((year): year is string => Boolean(year));
          const latestYear = revisions.sort((left, right) => right.localeCompare(left))[0];
          const label = displayProviderNames.has(providerKey)
            ? providerName
            : latestYear ? `${providerName} · ${latestYear}` : providerName;
          return {
            providerKey,
            label,
            pricedProfileCount: priced?.pricedProfileCount ?? 0,
            totalProfileCount: priced?.totalProfileCount ?? item.technicalCodes.length,
            isReference: priced?.isReference ?? providerKey === "arquetipo",
            otherAvailableFinishNames: [...(otherAvailableFinishNamesByProvider.get(providerKey) ?? [])],
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
      profilePrices,
      familyPreferences,
      itemErrors,
      canManageFamilyPreferences: canManageSupplierCatalog(auth.profile.rol),
      canManageSupplierPrices: canManageSupplierCatalog(auth.profile.rol),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) return NextResponse.json({ enabled: false }, { status: error.status });
    console.error("[API] resolver presentaciones proveedor", error);
    return NextResponse.json({ error: "No pudimos resolver las presentaciones comerciales." }, { status: 500 });
  }
}
