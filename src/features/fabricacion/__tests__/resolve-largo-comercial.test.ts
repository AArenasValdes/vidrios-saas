import { crearRecetaPlantillaVentoraCorredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { isRecipeReadyToActivate } from "@/features/fabricacion/components/recipe-activate-panel";
import {
  contarBloqueosCriticosReceta,
  tieneLargosComercialesPendientes,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import {
  resolveLargoComercialMm,
  resolveRecetaLargoComercialDefaultMm,
  VENTORA_LARGO_COMERCIAL_PRESET_MM,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricacionEntradaCalculo } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeTestRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const ENTRADA: FabricacionEntradaCalculo = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  cantidad: 1,
  hojas: 2,
  modulos: 2,
  variante: "estandar",
};

describe("resolveLargoComercialMm", () => {
  it("Caso A — L5000 sin tocar largos resuelve 6000 y calcula pauta", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `a-${nextId++}`,
    });

    expect(tieneLargosComercialesPendientes(receta)).toBe(false);
    expect(contarBloqueosCriticosReceta(receta)).toBe(0);
    expect(
      receta.perfiles.every(
        (profile) => resolveLargoComercialMm(profile, receta) === 6000
      )
    ).toBe(true);

    const resultado = calcularCubicacionYPauta(receta, ENTRADA);
    expect(resultado.totalLinealMm).toBe(10714);

    const pauta = construirPautaBarrasFabricacion({ receta, resultado });
    expect(pauta.barras.length).toBeGreaterThan(0);
    expect(
      pauta.advertencias.some((entry) => entry.codigo === "PERFIL_SIN_DATOS_DE_BARRA")
    ).toBe(false);
    expect(pauta.barras.every((bar) => bar.largoComercialMm === 6000)).toBe(true);
  });

  it("Caso B — cambiar default 6000→5800 no altera despiece", () => {
    let nextId = 0;
    const base = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `b-${nextId++}`,
    });
    const receta5800 = {
      ...base,
      configuracionCorte: {
        ...base.configuracionCorte,
        largoComercialDefaultMm: 5800,
      },
    };

    const despiece6000 = calcularCubicacionYPauta(base, ENTRADA);
    const despiece5800 = calcularCubicacionYPauta(receta5800, ENTRADA);

    expect(despiece5800.totalLinealMm).toBe(despiece6000.totalLinealMm);
    expect(despiece5800.perfiles).toEqual(despiece6000.perfiles);

    const pauta6000 = construirPautaBarrasFabricacion({
      receta: base,
      resultado: despiece6000,
    });
    const pauta5800 = construirPautaBarrasFabricacion({
      receta: receta5800,
      resultado: despiece5800,
    });

    expect(pauta5800.barras.every((bar) => bar.largoComercialMm === 5800)).toBe(
      true
    );
    expect(pauta6000.barras.every((bar) => bar.largoComercialMm === 6000)).toBe(
      true
    );
    expect(pauta5800.totalSobranteMm).not.toBe(pauta6000.totalSobranteMm);
  });

  it("Caso C — override por perfil usa 6100 solo en ese perfil", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `c-${nextId++}`,
    });
    const jambaId = receta.perfiles.find((p) => p.funcion === "Jamba")!.id;
    const withOverride = {
      ...receta,
      perfiles: receta.perfiles.map((profile) =>
        profile.id === jambaId
          ? { ...profile, largoComercialMm: 6100 }
          : profile
      ),
    };

    expect(resolveLargoComercialMm(withOverride.perfiles[2]!, withOverride)).toBe(
      6100
    );
    expect(resolveLargoComercialMm(withOverride.perfiles[0]!, withOverride)).toBe(
      6000
    );
  });

  it("Caso D — sin códigos puede cubicar, despiezar y activar", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `d-${nextId++}`,
    });
    expect(receta.perfiles.every((p) => !p.codigoPerfil.trim())).toBe(true);

    const output = calcularCubicacionYPauta(receta, ENTRADA);
    const pauta = construirPautaBarrasFabricacion({ receta, resultado: output });
    expect(output.calculable).toBe(true);
    expect(pauta.calculable).toBe(true);

    const tests = [
      {
        id: "t1",
        recipeId: "r1",
        organizationId: 1,
        name: "Caso",
        input: ENTRADA,
        expectedOutput: output,
        actualOutput: output,
        passed: true,
        isRequired: true,
        validatedBy: null,
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
        eliminadoEn: null,
      },
    ] satisfies FabricationRecipeTestRecord[];

    expect(isRecipeReadyToActivate(receta, tests)).toBe(true);
  });

  it("Caso E — receta antigua sin largoComercialDefaultMm resuelve 6000", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `e-${nextId++}`,
    });
    const legacy = {
      ...receta,
      configuracionCorte: {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
      },
    };

    expect(resolveRecetaLargoComercialDefaultMm(legacy)).toBe(
      VENTORA_LARGO_COMERCIAL_PRESET_MM
    );
    expect(
      legacy.perfiles.every(
        (profile) => resolveLargoComercialMm(profile, legacy) === 6000
      )
    ).toBe(true);
  });
});
