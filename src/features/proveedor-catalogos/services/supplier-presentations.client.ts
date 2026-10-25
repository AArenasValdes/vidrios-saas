import type { FabricacionTrabajoPresentationSelection } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

export type SupplierPresentationQuoteItemRequest = {
  itemId: string;
  catalogLineKey: string;
  familyKey: string;
  finishName: string | null;
  technicalCodes: string[];
  providerKey?: string | null;
};

export type SupplierProfilePricePreview = {
  technicalCode: string;
  profileName: string;
  providerKey: string;
  providerLabel: string;
  presentationId: string;
  supplierSku: string;
  presentationDescription: string;
  purchaseUnit: string;
  commercialLengthMm: number | null;
  netPrice: number | null;
  currency: string | null;
  priceSource: "reference" | "provider_adjustment" | "organization_override" | "workshop" | null;
  status: "priced" | "missing_price" | "ambiguous";
};

export type SupplierPriceProviderOption = {
  providerKey: string;
  label: string;
  pricedProfileCount: number;
  totalProfileCount: number;
  isReference: boolean;
};

export type SupplierPresentationResolutionResponse = {
  enabled: true;
  selections: Record<string, FabricacionTrabajoPresentationSelection[]>;
  itemErrors?: Record<string, string>;
  providerOptions?: Record<string, SupplierPriceProviderOption[]>;
  profilePrices?: Record<string, SupplierProfilePricePreview[]>;
  familyPreferences?: Record<string, string>;
  canManageFamilyPreferences?: boolean;
};

export async function resolveSupplierPresentationsForQuote(
  items: readonly SupplierPresentationQuoteItemRequest[],
  options: { includeProviderOptions?: boolean } = {}
): Promise<SupplierPresentationResolutionResponse | null> {
  if (items.length === 0) return null;
  try {
    const response = await fetch("/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ items, includeProviderOptions: options.includeProviderOptions === true }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as SupplierPresentationResolutionResponse;
    return payload.enabled === true ? payload : null;
  } catch {
    return null;
  }
}
