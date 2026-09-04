import { crearRecetaPlantillaVentoraCorredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";

describe("fabricacion-receta-lista-para-probar.service", () => {
  it("no bloquea L5000 solo por vidrio; lo deja como advertencia", () => {
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000");
    const evaluacion = evaluarRecetaListaParaProbar(receta);

    expect(evaluacion.bloqueos).not.toContain("Falta vidrio definido");
    expect(evaluacion.advertencias).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Sin tipo de vidrio base/i),
      ])
    );
  });

  it("habilita probar cuando la receta cumple criterios de perfiles", () => {
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000");
    const lista = evaluarRecetaListaParaProbar({
      ...receta,
      vidrios: [
        {
          id: "glass-1",
          nombre: "Vidrio principal",
          reglaAncho: { base: "ancho_por_hoja", ajusteMm: 0, multiplicador: 1 },
          reglaAlto: { base: "alto_por_hoja", ajusteMm: 0, multiplicador: 1 },
          reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
          requerido: false,
        },
      ],
      accesorios: [
        {
          id: "acc-1",
          codigo: "CAR-01",
          nombre: "Caracol",
          reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
          requerido: true,
        },
      ],
    });

    expect(lista.listaParaProbar).toBe(true);
    expect(lista.bloqueos).toHaveLength(0);
  });
});
