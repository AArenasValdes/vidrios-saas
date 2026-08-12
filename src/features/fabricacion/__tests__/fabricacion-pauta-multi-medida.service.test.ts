import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { calcularPautaBarrasMultiMedida } from "@/features/fabricacion/services/fabricacion-pauta-multi-medida.service";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";

describe("fabricacion-pauta-multi-medida.service", () => {
  const receta = {
    ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
    // Misma barra comercial / misma identidad de material en rieles para el test.
    perfiles: RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.perfiles.map(
      (profile) =>
        profile.funcion.startsWith("Riel")
          ? {
              ...profile,
              codigoPerfil: "RIEL-COMUN",
              nombrePerfil: "Riel",
              tallerPerfilId: "taller-riel",
            }
          : profile
    ),
  };

  it("consolida cortes y comparte tiras entre medidas distintas", () => {
    const medidaA = { anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1 };
    const medidaB = { anchoTotalMm: 1100, altoTotalMm: 1000, cantidad: 1 };

    const soloA = construirPautaBarrasFabricacion({
      receta,
      resultado: calcularCubicacionYPauta(receta, {
        ...medidaA,
        hojas: 2,
        modulos: 2,
      }),
    });
    const soloB = construirPautaBarrasFabricacion({
      receta,
      resultado: calcularCubicacionYPauta(receta, {
        ...medidaB,
        hojas: 2,
        modulos: 2,
      }),
    });

    const multi = calcularPautaBarrasMultiMedida({
      receta,
      medidas: [medidaA, medidaB],
    });

    expect(multi.pautaBarras.calculable).toBe(true);
    expect(multi.pautaBarras.barras.length).toBeGreaterThan(0);
    expect(multi.pautaBarras.barras.length).toBeLessThan(
      soloA.barras.length + soloB.barras.length
    );
  });
});
