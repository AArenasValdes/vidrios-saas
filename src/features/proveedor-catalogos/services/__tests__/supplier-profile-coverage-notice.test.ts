import { buildSupplierProfileCoverageNotice, resolveSupplierProfileCoverage } from "../supplier-presentation-resolution.service";

const price = (overrides: Partial<Parameters<typeof buildSupplierProfileCoverageNotice>[0]["prices"][number]> = {}) => ({
  technicalCode: "4201",
  profileName: "Marco",
  providerKey: "arquetipo",
  providerLabel: "Arquetipo",
  presentationId: "p-4201",
  supplierSku: "SKU-4201",
  presentationDescription: "Marco 6 m",
  purchaseUnit: "tira",
  commercialLengthMm: 6000,
  netPrice: 25000,
  currency: "CLP",
  priceSource: "reference" as const,
  status: "priced" as const,
  ...overrides,
});

describe("buildSupplierProfileCoverageNotice", () => {
  it("uses exact recipe profile codes and names the ones with missing price or presentation", () => {
    expect(buildSupplierProfileCoverageNotice({
      technicalCodes: ["4201", "4202", "4229"],
      providerKey: "arquetipo",
      prices: [price(), price({ technicalCode: "4202", presentationId: "", commercialLengthMm: null, netPrice: null, status: "missing_price" })],
    })).toBe("Precio o presentación pendiente para 4202, 4229.");
  });

  it("does not count another-finish base references as compatible coverage", () => {
    expect(buildSupplierProfileCoverageNotice({
      technicalCodes: ["4201"],
      providerKey: "alumco",
      prices: [price({ providerKey: "alumco", finishPriceBasis: "base_reference_other_finish" })],
    })).toBe("Precio o presentación pendiente para 4201.");
  });

  it("returns no warning when all exact profile presentations include price and length", () => {
    const input = {
      technicalCodes: ["4201"],
      providerKey: "arquetipo",
      prices: [price()],
    };
    expect(buildSupplierProfileCoverageNotice(input)).toBeNull();
    expect(resolveSupplierProfileCoverage(input)).toEqual({ totalCount: 1, coveredCount: 1, pendingCodes: [] });
  });
});
