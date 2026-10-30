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

  it("mantiene una preferencia explícita aunque sea histórica y la marca", () => {
    const selected = selectSupplierPriceLists({
      lists,
      preferredListIdsByProvider: { "provider-a": "a-old" },
      asOf: new Date("2026-09-01T00:00:00Z"),
    });
    expect(selected.get("provider-a")).toMatchObject({ id: "a-old", referenceStatus: "historical_reference" });
  });

  it("mantiene activa en Ventora la lista Alumco importada aunque venza la cotización fuente", () => {
    const selected = selectSupplierPriceLists({
      lists: [
        { id: "alumco-old", providerKey: "alumco", revision: "2026-09", publishedOn: "2026-09-01", validFrom: "2026-09-01", validUntil: "2026-09-08", createdAt: "2026-09-01T00:00:00Z" },
        { id: "alumco-reference", providerKey: "alumco", revision: "notes-2026-10-14", publishedOn: "2026-10-14", validFrom: "2026-10-14", validUntil: "2026-10-21", createdAt: "2026-10-14T00:00:00Z" },
        { id: "other-expired", providerKey: "provider-c", revision: "2026-09", publishedOn: "2026-09-01", validFrom: "2026-09-01", validUntil: "2026-09-08", createdAt: "2026-09-01T00:00:00Z" },
      ],
      asOf: new Date("2026-10-30T00:00:00Z"),
    });
    expect(selected.get("alumco")).toMatchObject({
      id: "alumco-reference",
      referenceStatus: "active_by_ventora_policy",
    });
    expect(selected.has("provider-c")).toBe(false);
  });

  it("usa la lista Alumco más nueva ya publicada según la política de Ventora", () => {
    const selected = selectSupplierPriceLists({
      lists: [
        { id: "alumco-old", providerKey: "alumco", revision: "2026-10-14", publishedOn: "2026-10-14", validFrom: "2026-10-14", validUntil: "2026-10-21", createdAt: "2026-10-14T00:00:00Z" },
        { id: "alumco-current", providerKey: "alumco", revision: "2026-10-29", publishedOn: "2026-10-29", validFrom: "2026-10-29", validUntil: null, createdAt: "2026-10-29T00:00:00Z" },
      ],
      asOf: new Date("2026-10-30T00:00:00Z"),
    });
    expect(selected.get("alumco")).toMatchObject({ id: "alumco-current", referenceStatus: "active_by_ventora_policy" });
  });

  it("no aplica la política activa Alumco a listas vencidas de otros proveedores", () => {
    const selected = selectSupplierPriceLists({
      lists: [{ id: "other-expired", providerKey: "provider-c", revision: "2026-09", publishedOn: "2026-09-01", validFrom: "2026-09-01", validUntil: "2026-09-08", createdAt: "2026-09-01T00:00:00Z" }],
      asOf: new Date("2026-10-30T00:00:00Z"),
    });
    expect(selected.has("provider-c")).toBe(false);
  });

  it("no permite seleccionar automáticamente una lista futura", () => {
    const selected = selectSupplierPriceLists({
      lists: [{ id: "future", providerKey: "alumco", revision: "2026-11", publishedOn: "2026-11-01", validFrom: "2026-11-01", validUntil: null, createdAt: "2026-11-01T00:00:00Z" }],
      asOf: new Date("2026-10-30T00:00:00Z"),
    });
    expect(selected.has("alumco")).toBe(false);
  });
});
