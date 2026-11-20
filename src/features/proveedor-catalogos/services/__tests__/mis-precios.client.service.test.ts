import { saveQuickWorkshopProfileCost } from "../mis-precios.client.service";

describe("saveQuickWorkshopProfileCost", () => {
  afterEach(() => jest.restoreAllMocks());

  it("guarda los costos del editor rápido como precio por tira al crear y editar", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await saveQuickWorkshopProfileCost({
      kind: "create", lineTemplateId: 205, technicalCode: "5001", profileName: "Riel superior",
      finishName: "Aluminio Mate", commercialLengthMm: 6000, netPrice: 15000, supplierName: "Sodal",
    });
    await saveQuickWorkshopProfileCost({
      kind: "update", lineTemplateId: 205, presentationId: "own-5001", expectedRevision: 1,
      commercialLengthMm: 6000, netPrice: 16000, supplierName: "Sodal",
    });

    const createBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    const updateBody = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(createBody).toMatchObject({ purchaseUnit: "TIRA", commercialLengthMm: 6000, supplierName: "Sodal" });
    expect(updateBody).toMatchObject({ purchaseUnit: "TIRA", commercialLengthMm: 6000, supplierName: "Sodal" });
  });
});
