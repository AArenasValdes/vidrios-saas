import { normalizeBrokenText, repairBrokenText } from "../repair-broken-text";

describe("repair-broken-text", () => {
  it("debe reparar palabras rotas visibles", () => {
    expect(repairBrokenText("Ventanas, puertas y paÃ±os fijos")).toBe(
      "Ventanas, puertas y paños fijos"
    );
    expect(repairBrokenText("Incoloro monolitico 5mm")).toBe(
      "Incoloro monolítico 5mm"
    );
  });

  it("debe normalizar texto roto para comparaciones", () => {
    expect(normalizeBrokenText("Incoloro monolitico 5mm")).toBe(
      "incoloro monolitico 5mm"
    );
    expect(normalizeBrokenText("paÃ±os")).toBe("panos");
  });
});
