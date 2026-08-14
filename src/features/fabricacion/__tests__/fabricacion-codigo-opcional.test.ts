import { isRecipeReadyToActivate } from "@/features/fabricacion/components/recipe-activate-panel";
import { crearRecetaPlantillaVentoraCorredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import {
  contarBloqueosCriticosReceta,
  tieneLargosComercialesPendientes,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { validarRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-validacion.service";
import type { FabricationRecipeTestRecord } from "@/features/fabricacion/types/fabricacion-persistence";

describe("código comercial opcional y largo progresivo", () => {
  it("no bloquea prueba/validación geométrica sin código ni largo comercial", () => {
    let nextId = 0;
    const recipe = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `opt-${nextId++}`,
    });

    expect(recipe.perfiles.every((profile) => !profile.codigoPerfil.trim())).toBe(
      true
    );
    expect(contarBloqueosCriticosReceta(recipe)).toBe(0);
    expect(tieneLargosComercialesPendientes(recipe)).toBe(false);

    const resultado = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: "estandar",
    });
    expect(resultado.calculable).toBe(true);
    expect(resultado.totalLinealMm).toBe(10714);

    const validation = validarRecetaFabricacion({
      ...recipe,
      estado: "validada",
    });
    expect(validation.ok).toBe(true);
    expect(
      validation.advertencias.some((entry) => entry.codigo === "PERFIL_SIN_CODIGO")
    ).toBe(false);
    expect(
      validation.advertencias.some(
        (entry) => entry.codigo === "PERFIL_SIN_LARGO_COMERCIAL"
      )
    ).toBe(false);
  });

  it("habilita pauta de barras con resolver aunque el código esté vacío", () => {
    let nextId = 0;
    const recipe = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `bar-${nextId++}`,
    });

    const resultado = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: "estandar",
    });
    const pauta = construirPautaBarrasFabricacion({
      receta: recipe,
      resultado,
    });

    expect(pauta.barras.length).toBeGreaterThan(0);
    expect(
      pauta.advertencias.some((entry) => entry.codigo === "PERFIL_SIN_DATOS_DE_BARRA")
    ).toBe(false);
  });

  it("activa con prueba aprobada sin exigir códigos comerciales", () => {
    let nextId = 0;
    const recipe = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `act-${nextId++}`,
    });
    const input = {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: "estandar" as const,
    };
    const output = calcularCubicacionYPauta(recipe, input);
    const tests = [
      {
        id: "t1",
        recipeId: "r1",
        organizationId: 1,
        name: "Caso",
        input,
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

    expect(isRecipeReadyToActivate(recipe, tests)).toBe(true);
  });
});
