import {
  filterVidrios,
  getGroupStatusTitle,
  sortGlassOptions,
} from "../paso-dos-wizard-movil.utils";

describe("paso-dos-wizard-movil utils", () => {
  const vidrios = [
    "Templado 10mm",
    "Incoloro monolitico 6mm",
    "DVH 4+9+4",
    "Incoloro monolitico 5mm",
    "Laminado 3+3",
    "Templado 8mm",
  ] as const;

  it("debe ordenar vidrios por familia y espesor antes de mostrar", () => {
    expect(sortGlassOptions(vidrios)).toEqual([
      "Incoloro monolitico 5mm",
      "Incoloro monolitico 6mm",
      "DVH 4+9+4",
      "Laminado 3+3",
      "Templado 8mm",
      "Templado 10mm",
    ]);
  });

  it("debe permitir buscar vidrios con alias cortos", () => {
    expect(filterVidrios("temp", vidrios)).toEqual([
      "Templado 10mm",
      "Templado 8mm",
    ]);
  });

  it("debe resumir el grupo con un texto corto y legible", () => {
    expect(getGroupStatusTitle(10, "Ventana", "Corredera")).toBe(
      "10 Ventanas - Corredera"
    );
  });
});
