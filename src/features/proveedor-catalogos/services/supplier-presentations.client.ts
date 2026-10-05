import type { FabricacionTrabajoPresentationSelection } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

export type SupplierPresentationQuoteItemRequest = {
  itemId: string;
  catalogLineKey: string;
  familyKey: string;
  finishName: string | null;
  technicalCodes: string[];
};

export type SupplierPresentationResolutionResponse = {
  enabled: true;
  selections: Record<string, FabricacionTrabajoPresentationSelection[]>;
};

export async function resolveSupplierPresentationsForQuote(
  items: readonly SupplierPresentationQuoteItemRequest[]
): Promise<SupplierPresentationResolutionResponse | null> {
  if (items.length === 0) return null;
  try {
    const response = await fetch("/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ items }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as SupplierPresentationResolutionResponse;
    return payload.enabled === true ? payload : null;
  } catch {
    return null;
  }
}
