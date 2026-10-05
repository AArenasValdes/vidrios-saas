import { PriceListSelectionError, selectSupplierPriceLists, type SupplierPriceListCandidate } from "../price-list-selection.service";

const lists: SupplierPriceListCandidate[] = [
  { id: "a-old", providerKey: "provider-a", revision: "2026-01", publishedOn: "2026-01-01", validFrom: "2026-01-01", validUntil: "2026-06-30", createdAt: "2026-01-01T00:00:00Z" },
  { id: "a-current", providerKey: "provider-a", revision: "2026-07", publishedOn: "2026-07-01", validFrom: "2026-07-01", validUntil: null, createdAt: "2026-07-01T00:00:00Z" },
  { id: "b-current", providerKey: "provider-b", revision: "r4", publishedOn: "2026-08-01", validFrom: "2026-08-01", validUntil: null, createdAt: "2026-08-01T00:00:00Z" },
];

describe("selección de lista por proveedor", () => {
  it("usa una selección explícita y, por separado, la lista activa más nueva de cada proveedor", () => {
    const selected = selectSupplierPriceLists({
      lists,
      asOf: new Date("2026-09-01T00:00:00Z"),
      selectedByProvider: { "provider-a": { revision: "2026-01" } },
    });
    expect(selected.get("provider-a")?.id).toBe("a-old");
    expect(selected.get("provider-b")?.id).toBe("b-current");
  });

  it("rechaza una revisión que pertenece a otro proveedor en vez de cruzar listas", () => {
    expect(() => selectSupplierPriceLists({
      lists,
      asOf: new Date("2026-09-01T00:00:00Z"),
      selectedByProvider: { "provider-a": { listId: "b-current" } },
    })).toThrow(PriceListSelectionError);
  });

  it("respeta la preferencia vigente de cada proveedor y omite los que no tienen lista activa", () => {
    const selected = selectSupplierPriceLists({
      lists,
      preferredListIdsByProvider: { "provider-a": "a-current" },
      asOf: new Date("2026-09-01T00:00:00Z"),
    });
    expect(selected.get("provider-a")?.id).toBe("a-current");
    expect(selected.get("provider-b")?.id).toBe("b-current");
  });

  it("rechaza una preferencia vencida", () => {
    expect(() => selectSupplierPriceLists({
      lists,
      preferredListIdsByProvider: { "provider-a": "a-old" },
      asOf: new Date("2026-09-01T00:00:00Z"),
    })).toThrow(PriceListSelectionError);
  });
});
