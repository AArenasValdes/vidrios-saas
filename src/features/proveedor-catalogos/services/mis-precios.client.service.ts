export type MyPresentationPrice = {
  presentationId: string;
  familyKeys?: string[];
  sku: string;
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
  percentage: number;
  presentations: MyPresentationPrice[];
};

export type MyPricesCatalog = { providers: MySupplierPrices[] };

const endpoint = "/api/proveedor-catalogos/mis-precios";

export async function loadMyPrices(): Promise<MyPricesCatalog> {
  const response = await fetch(endpoint, { cache: "no-store" });
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
