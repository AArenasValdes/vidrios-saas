import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { resolveFabricacionParametrosCorte } from "@/features/fabricacion/services/fabricacion-parametros-corte.service";
import { construirSnapshotFabricacionCotizacion, recalcularPautaSnapshotConParametrosCorte } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { crearRecetaPlantillaVentoraCorredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

function recipe(cutLengthMm = 2000): FabricacionReceta {
  return {
    schemaVersion: 1,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: "bar-test",
      codigo: "BAR-TEST",
      nombre: "Prueba de barras",
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      herraje: null,
      variante: "estandar",
    },
    perfiles: [
      {
        id: "perfil-a",
        codigoPerfil: "P-01",
        nombrePerfil: "Perfil A",
        funcion: "Riel",
        largoComercialMm: 6000,
        reglaMedida: { base: "fijo_mm", valorFijoMm: cutLengthMm },
        reglaCantidad: { tipo: "fija", cantidad: 3 },
        requerido: true,
      },
    ],
    vidrios: [],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: 3,
      despunteInicialMm: 10,
      sobranteMinimoAprovechableMm: 500,
    },
    notasValidacion: [],
  };
}

const input = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  cantidad: 1,
  hojas: 2,
  modulos: 2,
  variante: "estandar",
};

describe("pauta referencial de barras", () => {
  it("distingue kerf desconocido de cero confirmado para 4 cortes de 1500 mm", () => {
    const definition = recipe(1500);
    definition.perfiles[0]!.reglaCantidad = { tipo: "fija", cantidad: 4 };
    definition.configuracionCorte = { perdidaCorteMm: null, despunteInicialMm: null, sobranteMinimoAprovechableMm: null };
    const resultado = calcularCubicacionYPauta(definition, input);
    const teorica = construirPautaBarrasFabricacion({ receta: definition, resultado });
    expect(teorica.barras).toHaveLength(1);
    expect(teorica.barras[0]?.sobranteMm).toBe(0);
    expect(teorica.parametrosFisicos).toMatchObject({ estado: "pendiente", perdidaCorteMm: null, despunteInicialMm: null });
    definition.configuracionCorte = {
      perdidaCorteMm: 3, despunteInicialMm: 0, sobranteMinimoAprovechableMm: null,
      confirmacionFisica: { procedimiento: "por_pieza", fuente: "Prueba de taller", largosComercialesConfirmados: true },
    };
    const confirmada = construirPautaBarrasFabricacion({ receta: definition, resultado });
    expect(confirmada.parametrosFisicos).toMatchObject({ estado: "confirmado", perdidaCorteMm: 3 });
    expect(confirmada.barras).toHaveLength(2);
    expect(confirmada.barras.flatMap((bar) => bar.cortes)).toHaveLength(4);
    definition.configuracionCorte.perdidaCorteMm = 0;
    const cero = construirPautaBarrasFabricacion({ receta: definition, resultado });
    expect(cero.parametrosFisicos).toMatchObject({ estado: "confirmado", perdidaCorteMm: 0 });
    expect(cero.barras[0]?.sobranteMm).toBe(0);
  });
  it("usa parámetros confirmados del taller en una receta sin reglas de sierra y conserva la receta", () => {
    const definition = recipe(1500);
    definition.perfiles[0]!.reglaCantidad = { tipo: "fija", cantidad: 4 };
    definition.configuracionCorte = {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: 450,
    };
    const original = JSON.stringify(definition);
    const applied = resolveFabricacionParametrosCorte({
      recipeConfiguration: definition.configuracionCorte,
      organizationSettings: {
        perdidaCorteMm: 3,
        despunteInicialMm: 12,
        procedimiento: "por_pieza",
        fuente: "Parámetros de corte confirmados por el taller.",
        largosComercialesConfirmados: false,
        confirmedBy: "user-1",
        confirmedAt: "2026-11-14T12:00:00.000Z",
        organizationId: 8,
      },
    });
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
      parametrosCorte: applied,
    });

    expect(result.barras).toHaveLength(2);
    expect(result.barras.flatMap((bar) => bar.cortes)).toHaveLength(4);
    expect(result.parametrosFisicos).toMatchObject({
      estado: "pendiente",
      perdidaCorteMm: 3,
      despunteInicialMm: 12,
      origenParametros: "organizacion",
      confirmadoPor: "user-1",
      organizacionId: 8,
    });
    expect(JSON.stringify(definition)).toBe(original);

    const recipeRecord: FabricationRecipeRecord = {
      id: "recipe-org-settings", organizationId: 8, lineTemplateId: 25, scope: "ventora", providerName: "Ventora",
      lineName: "L25", typology: "corredera", leavesCount: 2, variant: "estandar", version: 1,
      status: "validated", definition, sourceType: "manual", sourceReference: null, parentRecipeId: null,
      validatedAt: null, validatedBy: null, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z", eliminadoEn: null,
    };
    const snapshot = construirSnapshotFabricacionCotizacion({
      recipe: recipeRecord,
      entrada: input,
      organizationCutSettings: {
        perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza",
        fuente: "Parámetros de corte confirmados por el taller.", largosComercialesConfirmados: false,
        confirmedBy: "user-1", confirmedAt: "2026-11-14T12:00:00.000Z", organizationId: 8,
      },
    });
    expect(snapshot.pautaBarras?.barras).toHaveLength(2);
    expect(snapshot.pautaBarras?.parametrosFisicos).toMatchObject({ origenParametros: "organizacion", estado: "pendiente", organizacionId: 8 });
  });

  it("aplica el ajuste negativo de la receta una sola vez y reserva sierra/despunte para distribuir barras", () => {
    const definition = recipe();
    definition.perfiles[0]!.reglaMedida = {
      base: "ancho_total",
      multiplicador: 1,
      ajusteMm: -20,
    };
    definition.perfiles[0]!.reglaCantidad = { tipo: "fija", cantidad: 1 };
    definition.configuracionCorte = {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
    };
    const inputWithTwoWindows = { ...input, anchoTotalMm: 1200, cantidad: 2 };
    const record: FabricationRecipeRecord = {
      id: "recipe-negative-adjustment", organizationId: 8, lineTemplateId: 25,
      scope: "organization", providerName: "Taller", lineName: "L25 personalizada",
      typology: "corredera", leavesCount: 2, variant: "estandar", version: 1,
      status: "validated", definition, sourceType: "manual", sourceReference: "taller:personalizada:l25",
      sourceName: null, sourceRevision: null, parentRecipeId: null, validatedAt: null,
      validatedBy: null, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
      eliminadoEn: null,
    };
    const settings: FabricacionParametrosCorteConfirmados = {
      perdidaCorteMm: 3,
      despunteInicialMm: 12,
      procedimiento: "por_pieza",
      fuente: "Parámetros confirmados del taller QA.",
      largosComercialesConfirmados: false,
      confirmedBy: "user-1",
      confirmedAt: "2026-11-14T12:00:00.000Z",
      organizationId: 8,
    };
    const snapshotWithoutShopSettings = construirSnapshotFabricacionCotizacion({
      recipe: record,
      entrada: inputWithTwoWindows,
    });
    const snapshotWithShopSettings = construirSnapshotFabricacionCotizacion({
      recipe: record,
      entrada: inputWithTwoWindows,
      organizationCutSettings: settings,
    });

    expect(snapshotWithShopSettings.result.perfiles).toHaveLength(1);
    expect(snapshotWithShopSettings.result.perfiles[0]).toMatchObject({ medidaMm: 1180, cantidadPiezas: 2 });
    expect(snapshotWithShopSettings.pauta).toHaveLength(1);
    expect(snapshotWithShopSettings.pauta[0]).toMatchObject({ medidaMm: 1180, cantidadPiezas: 2 });
    expect(snapshotWithShopSettings.result).toEqual(snapshotWithoutShopSettings.result);
    expect(snapshotWithShopSettings.pauta).toEqual(snapshotWithoutShopSettings.pauta);
    expect(snapshotWithShopSettings.pautaBarras?.parametrosFisicos).toMatchObject({
      perdidaCorteMm: 3,
      despunteInicialMm: 12,
      origenParametros: "organizacion",
    });
    expect(snapshotWithShopSettings.pautaBarras?.barras.flatMap((bar) => bar.cortes.map((cut) => cut.largoMm)))
      .toEqual([1180, 1180]);
    expect(snapshotWithShopSettings.pautaBarras?.barras.reduce((sum, bar) => sum + bar.despunteInicialMm, 0))
      .toBe(12);
    expect(snapshotWithShopSettings.pautaBarras?.totalPerdidaCortesMm).toBe(6);
  });

  it("recalcula un snapshot solo con su receta exacta y conserva las longitudes congeladas", () => {
    const definition = recipe(1500);
    definition.perfiles[0]!.reglaCantidad = { tipo: "fija", cantidad: 4 };
    definition.configuracionCorte = { perdidaCorteMm: null, despunteInicialMm: null, sobranteMinimoAprovechableMm: null };
    const record: FabricationRecipeRecord = {
      id: "recipe-1", organizationId: 8, lineTemplateId: 25, scope: "ventora", providerName: "Ventora",
      lineName: "L25", typology: "corredera", leavesCount: 2, variant: "estandar", version: 1,
      status: "validated", definition, sourceType: "manual", sourceReference: null, parentRecipeId: null,
      validatedAt: null, validatedBy: null, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z", eliminadoEn: null,
    };
    const snapshot = construirSnapshotFabricacionCotizacion({ recipe: record, entrada: input });
    const recalculated = recalcularPautaSnapshotConParametrosCorte({
      snapshot,
      recipe: record,
      parameters: {
        perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza",
        fuente: "Ajuste confirmado solo para este trabajo.", largosComercialesConfirmados: false,
        confirmedBy: "user-1", confirmedAt: "2026-11-14T12:00:00.000Z", organizationId: 8,
      },
    });

    expect(snapshot.pautaBarras?.barras).toHaveLength(1);
    expect(recalculated?.pautaBarras?.barras).toHaveLength(2);
    expect(recalculated?.pautaBarras?.barras.flatMap((bar) => bar.cortes)).toHaveLength(4);
    expect(recalculated?.result).toEqual(snapshot.result);
    expect(recalculated?.pauta).toEqual(snapshot.pauta);
    expect(recalculated).toMatchObject({
      schemaVersion: snapshot.schemaVersion,
      tipo: snapshot.tipo,
      recipeId: snapshot.recipeId,
      recipeDefinitionId: snapshot.recipeDefinitionId,
      recipeVersion: snapshot.recipeVersion,
      recipeStatus: snapshot.recipeStatus,
      recipeScope: snapshot.recipeScope,
      lineTemplateId: snapshot.lineTemplateId,
      recipeIdentity: snapshot.recipeIdentity,
      input: snapshot.input,
      selectedVariant: snapshot.selectedVariant,
      vidrios: snapshot.vidrios,
      formulaVersion: snapshot.formulaVersion,
    });
    expect(recalculated?.pautaBarras?.barras.flatMap((bar) => bar.cortes.map((cut) => [cut.componenteId, cut.codigoPerfil, cut.largoMm])))
      .toEqual(snapshot.pautaBarras?.barras.flatMap((bar) => bar.cortes.map((cut) => [cut.componenteId, cut.codigoPerfil, cut.largoMm])));
    expect(recalculated?.pautaBarras?.parametrosFisicos).toMatchObject({ origenParametros: "trabajo", estado: "pendiente", organizacionId: 8 });
    expect(recalcularPautaSnapshotConParametrosCorte({
      snapshot,
      recipe: { ...record, version: 2 },
      parameters: {
        perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza",
        fuente: "Ajuste de prueba", largosComercialesConfirmados: false,
      },
    })).toBeNull();
  });
  it("aplica FFD con perdida por corte y despunte inicial", () => {
    const definition = recipe();
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.calculable).toBe(true);
    expect(result.barras).toHaveLength(2);
    expect(result.barras[0]).toMatchObject({
      codigoPerfil: "P-01",
      usadoMm: 4016,
      perdidaCortesMm: 6,
      sobranteMm: 1984,
      sobranteAprovechable: true,
    });
    expect(result.barras[0]?.cortes).toHaveLength(2);
  });

  it("advierte cuando una pieza supera la barra comercial", () => {
    const definition = recipe(6100);
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.calculable).toBe(false);
    expect(result.advertencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: "CORTE_SUPERA_BARRA_COMERCIAL" }),
      ])
    );
  });

  it("calcula tiras con largo resuelto aunque el perfil no tenga largo persistido", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `resolver-${nextId++}`,
    });
    const result = construirPautaBarrasFabricacion({
      receta,
      resultado: calcularCubicacionYPauta(receta, input),
    });

    expect(result.calculable).toBe(true);
    expect(result.barras.length).toBeGreaterThan(0);
    expect(
      result.advertencias.some((entry) => entry.codigo === "PERFIL_SIN_DATOS_DE_BARRA")
    ).toBe(false);
  });

  it("calcula tiras con largo comercial aunque no haya parámetros de sierra explícitos", () => {
    const definition = { ...recipe(), configuracionCorte: undefined };
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.calculable).toBe(true);
    expect(result.barras.length).toBeGreaterThan(0);
    expect(
      result.advertencias.some((entry) => entry.codigo === "PAUTA_BARRAS_INCOMPLETA")
    ).toBe(false);
  });

  it("no mezcla perfiles de la misma identidad si sus largos comerciales son distintos", () => {
    const definition = recipe(2000);
    definition.configuracionCorte = {
      perdidaCorteMm: 0,
      despunteInicialMm: 0,
      sobranteMinimoAprovechableMm: 0,
    };
    definition.perfiles[0]!.reglaCantidad = { tipo: "fija", cantidad: 2 };
    definition.perfiles.push({
      ...definition.perfiles[0]!,
      id: "perfil-b",
      largoComercialMm: 3000,
    });

    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.barras).toHaveLength(3);
    expect(result.barras.map((bar) => bar.largoComercialMm).sort((a, b) => a - b)).toEqual([3000, 3000, 6000]);
    expect(result.barras.map((bar) => bar.cortes.length).sort((a, b) => a - b)).toEqual([1, 1, 2]);
  });

  it("mantiene el código comercial de receta aunque use una identidad interna de taller", () => {
    const definition = recipe();
    definition.perfiles[0] = {
      ...definition.perfiles[0]!,
      tallerPerfilId: "perfil-taller-interno-42",
      codigoPerfil: "RS01",
      nombrePerfil: "Riel superior propio",
    };
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.barras).toHaveLength(2);
    expect(result.barras[0]).toMatchObject({
      materialKey: "perfil-taller-interno-42",
      codigoPerfil: "RS01",
      nombrePerfil: "Riel superior propio",
    });
    expect(result.barras.flatMap((barra) => barra.cortes)).toEqual(
      expect.arrayContaining([expect.objectContaining({ codigoPerfil: "RS01" })])
    );
  });
});
