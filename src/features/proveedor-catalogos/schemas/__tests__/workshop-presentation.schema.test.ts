import { workshopPurchaseUnitSchema } from "../workshop-presentation.schema";

describe("unidad de compra de presentación del taller", () => {
  it.each(["M", "UN", "KG", "PAR", "TIRA", "M2", "TUBO"])("acepta %s en el contrato compartido", (unit) => {
    expect(workshopPurchaseUnitSchema.safeParse(unit).success).toBe(true);
  });

  it("rechaza unidades que la API no reconoce", () => {
    expect(workshopPurchaseUnitSchema.safeParse("METROS").success).toBe(false);
  });
});
