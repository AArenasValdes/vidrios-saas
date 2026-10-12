import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";

describe("inferirTipologiaFabricacionPieza", () => {
  it("prioriza Shower sobre puerta y corredera genéricas", () => {
    expect(
      inferirTipologiaFabricacionPieza({
        tipo: "Puerta",
        sistema: "Shower Door",
        configuracion: "Corredera frontal",
        nombre: "Shower corredera",
      })
    ).toBe("shower");
  });

  it("conserva la clasificación de una puerta corredera común", () => {
    expect(
      inferirTipologiaFabricacionPieza({
        tipo: "Puerta corredera",
        nombre: "Puerta de acceso",
      })
    ).toBe("puerta_corredera");
  });
});
