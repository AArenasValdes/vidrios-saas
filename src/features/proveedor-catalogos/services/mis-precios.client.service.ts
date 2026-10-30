export type MyPresentationPrice = {
  presentationId: string;
  familyKeys?: string[];
  technicalCodes?: string[];
  sku: string;
  /** Null when a technical code is used only as an internal placeholder, not as a provider SKU. */
  supplierSku?: string | null;
  name: string;
  finish: string | null;
  purchaseUnit: string;
  commercialLengthMm: number | null;
  referenceNetPrice: number | null;
  currency: string | null;
  ownNetPrice: number | null;
  effective: { unitNetPrice: number; source: "reference" | "provider_adjustment" | "organization_override"; currency: string } | null;
};

export type MySupplierPrices = {
  providerKey: string;
  providerName: string;
  revision: string;
  priceListStatus?: "within_stated_validity" | "active_by_ventora_policy" | "historical_reference" | "not_yet_valid";
  publishedOn?: string | null;
  sourceQuotationValidUntil?: string | null;
  percentage: number;
  presentations: MyPresentationPrice[];
};

export type MyPricesCatalog = { providers: MySupplierPrices[] };

const endpoint = "/api/proveedor-catalogos/mis-precios";

export async function loadMyPrices(): Promise<MyPricesCatalog> {
  // The API sends Cache-Control: private, no-store for the personalized result.
  // A client no-store directive would also bypass Next's common catalog cache
  // in development, causing the whole supplier catalog to be queried again.
  const response = await fetch(endpoint);
  const payload = await response.json() as MyPricesCatalog & { error?: string };
  if (!response.ok) throw new Error(payload.error || "No pudimos cargar tus precios.");
  return payload;
}

export async function saveMyPriceChange(change:
  | { kind: "adjustment"; providerKey: string; percentage: number }
  | { kind: "override"; providerKey: string; presentationId: string; netPrice: number; currency: string }
  | { kind: "clear_override"; providerKey: string; presentationId: string }
) {
  const response = await fetch(endpoint, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(change) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error || "No pudimos guardar el precio.");
}

export async function saveQuotePresentationPrice(change: {
  providerKey: string;
  presentationId: string;
  familyKey: string;
  technicalCode: string;
  finishName: string;
  netPrice: number;
  currency: string;
}) {
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "quote_override", ...change }),
  });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error || "No pudimos guardar el precio.");
}
