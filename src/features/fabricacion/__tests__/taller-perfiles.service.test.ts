import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import {
  applyLargoToAllProfiles,
  applyLargoToProfilesWithoutLength,
  applyTallerPerfilToComponent,
  collectFrequentLargosMm,
  createTallerPerfilRef,
  profileReferenceLabel,
  resolvePerfilMaterialKey,
} from "@/features/fabricacion/services/taller-perfiles.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

function baseRecipe(): FabricacionReceta {
  return {
    schemaVersion: 1,
    version: 1,
    estado: "borrador",
    identidad: {
      recetaId: "line-test",
      codigo: "LINE",
      nombre: "L5000",
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      herraje: null,
      variante: "estandar",
    },
    perfiles: [
      {
        id: "cabezal",
        codigoPerfil: "",
        nombrePerfil: "",
        funcion: "Cabezal",
        largoComercialMm: null,
        reglaMedida: { base: "ancho_por_hoja", ajusteMm: -20 },
        reglaCantidad: { tipo: "fija", cantidad: 2 },
        requerido: true,
      },
      {
        id: "zocalo",
        codigoPerfil: "",
        nombrePerfil: "",
        funcion: "Zócalo",
        largoComercialMm: null,
        reglaMedida: { base: "ancho_por_hoja", ajusteMm: -20 },
        reglaCantidad: { tipo: "fija", cantidad: 2 },
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

describe("taller-perfiles.service", () => {
  it("prioriza el código comercial sobre el nombre al rotular referencia", () => {
    expect(
      profileReferenceLabel({
        codigoPerfil: "5001",
        nombrePerfil: "Riel superior",
        tallerPerfilId: null,
      })
    ).toBe("5001");
  });

  it("crea perfil rápido sin código y reutiliza la misma identidad en dos funciones", () => {
    const tallerPerfil = createTallerPerfilRef({
      nombre: "Perfil hoja L5000",
      codigoComercial: "",
      largoComercialMm: 6000,
    });

    const recipe = baseRecipe();
    const cabezal = applyTallerPerfilToComponent(recipe.perfiles[0]!, tallerPerfil);
    const zocalo = applyTallerPerfilToComponent(recipe.perfiles[1]!, tallerPerfil);

    expect(cabezal.tallerPerfilId).toBe(tallerPerfil.id);
    expect(zocalo.tallerPerfilId).toBe(tallerPerfil.id);
    expect(cabezal.nombrePerfil).toBe("Perfil hoja L5000");
    expect(zocalo.nombrePerfil).toBe("Perfil hoja L5000");
    expect(cabezal.codigoPerfil).toBe("");
    expect(zocalo.codigoPerfil).toBe("");
    expect(cabezal.largoComercialMm).toBe(6000);
    expect(zocalo.largoComercialMm).toBe(6000);
    expect(resolvePerfilMaterialKey(cabezal)).toBe(resolvePerfilMaterialKey(zocalo));
  });

  it("no sobrescribe un largo ya definido en la fila al reasignar perfil", () => {
    const tallerPerfil = createTallerPerfilRef({
      nombre: "Jamba L5000",
      largoComercialMm: 6000,
    });
    const current = {
      ...baseRecipe().perfiles[0]!,
      largoComercialMm: 5800,
    };

    const next = applyTallerPerfilToComponent(current, tallerPerfil, {
      prefillLargo: true,
    });

    expect(next.largoComercialMm).toBe(5800);
    expect(next.tallerPerfilId).toBe(tallerPerfil.id);
  });

  it("prioriza largos usados por el taller y mantiene defaults restantes", () => {
    const recipe = baseRecipe();
    recipe.perfiles[0]!.largoComercialMm = 6000;
    recipe.perfiles[1]!.largoComercialMm = 6000;

    const result = collectFrequentLargosMm([recipe]);
    expect(result.usedByWorkshop[0]).toBe(6000);
    expect(result.otherFrequent).toEqual([5800, 6400]);
  });

  it("aplica un largo a todos los perfiles", () => {
    const recipe = baseRecipe();
    const next = applyLargoToAllProfiles(recipe, 5950);
    expect(next.perfiles.every((profile) => profile.largoComercialMm === 5950)).toBe(
      true
    );
  });

  it("aplica un largo solo a perfiles sin largo", () => {
    const recipe = {
      ...baseRecipe(),
      perfiles: [
        { ...baseRecipe().perfiles[0]!, largoComercialMm: 6000 },
        { ...baseRecipe().perfiles[1]!, largoComercialMm: null },
      ],
    };

    const next = applyLargoToProfilesWithoutLength(recipe, 6000);
    expect(next.perfiles[0]?.largoComercialMm).toBe(6000);
    expect(next.perfiles[1]?.largoComercialMm).toBe(6000);
  });

  it("agrupa cortes de Cabezal y Zócalo en el mismo material de barra", () => {
    const tallerPerfil = createTallerPerfilRef({
      nombre: "Perfil hoja L5000",
      codigoComercial: "",
      largoComercialMm: 6000,
    });
    const recipe = baseRecipe();
    recipe.perfiles = [
      applyTallerPerfilToComponent(recipe.perfiles[0]!, tallerPerfil),
      applyTallerPerfilToComponent(recipe.perfiles[1]!, tallerPerfil),
    ];

    const resultado = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: "estandar",
    });
    const pauta = construirPautaBarrasFabricacion({ receta: recipe, resultado });

    expect(pauta.calculable).toBe(true);
    expect(pauta.barras.length).toBeGreaterThan(0);
    expect(
      new Set(pauta.barras.map((barra) => barra.codigoPerfil)).size
    ).toBe(1);
    const allCuts = pauta.barras.flatMap((barra) => barra.cortes);
    expect(allCuts.some((cut) => cut.funcion === "Cabezal")).toBe(true);
    expect(allCuts.some((cut) => cut.funcion === "Zócalo")).toBe(true);
  });
});
