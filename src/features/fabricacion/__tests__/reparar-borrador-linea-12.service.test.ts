import { crearRecetaP2U } from "@/features/fabricacion/fixtures/traditional-p2u-recipes";
import { prepararReparacionBorradorCatalogo } from "@/features/fabricacion/services/reparar-borrador-proyectante.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

const CATALOG_KEY = "ventora:serie-12-shower-corredera";

function makeIncompleteDraft(): FabricacionReceta {
  const recipe = crearRecetaP2U({ catalogKey: CATALOG_KEY, lineName: "Serie 12" });
  return {
    ...recipe,
    perfiles: recipe.perfiles.slice(0, 4).map((profile) => ({
      ...profile,
      reglaMedida: { ...profile.reglaMedida, ajusteMm: 0 },
    })),
    configuracionCorte: {
      perdidaCorteMm: 3,
      despunteInicialMm: 25,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: 5900,
    },
    notasValidacion: ["Nota propia del taller"],
  };
}

function makeRow(definition: FabricacionReceta) {
  return {
    id: "l12-draft",
    line_template_id: 541,
    line_name: "Serie 12 — Shower Door",
    status: "draft",
    version: 1,
    source_reference: "ventora-arquetipo:shower",
    source_type: "manual",
    definition,
    updated_at: "2026-10-07T12:00:00.000Z",
  };
}

describe("reparación segura del borrador de Línea 12 Shower", () => {
  it("completa los dos descuentos y el segundo corte 1204, preservando datos del taller", () => {
    const repaired = prepararReparacionBorradorCatalogo(
      CATALOG_KEY,
      makeRow(makeIncompleteDraft()),
    );

    expect(repaired?.perfiles.map((profile) => ({
      code: profile.codigoPerfil,
      base: profile.reglaMedida.base,
      adjustment: profile.reglaMedida.ajusteMm ?? 0,
      quantity: profile.reglaCantidad.cantidad,
      cut: profile.corte,
    }))).toEqual([
      { code: "1203", base: "ancho_total", adjustment: -5, quantity: 1, cut: "90°" },
      { code: "1201", base: "ancho_total", adjustment: -5, quantity: 1, cut: "90°" },
      { code: "1202", base: "alto_total", adjustment: -3, quantity: 2, cut: "90°" },
      { code: "1204", base: "ancho_por_hoja", adjustment: 5, quantity: 4, cut: "45°" },
      { code: "1204", base: "alto_modulo", adjustment: -65, quantity: 1, cut: "45°" },
    ]);
    expect(repaired?.configuracionCorte).toMatchObject({
      perdidaCorteMm: 3,
      despunteInicialMm: 25,
      largoComercialDefaultMm: 5900,
    });
    expect(repaired?.notasValidacion).toContain("Nota propia del taller");
  });

  it("no reemplaza una receta con cualquier edición en perfiles", () => {
    const edited = makeIncompleteDraft();
    edited.perfiles[0] = {
      ...edited.perfiles[0]!,
      reglaMedida: { ...edited.perfiles[0]!.reglaMedida, ajusteMm: -1 },
    };

    expect(
      prepararReparacionBorradorCatalogo(CATALOG_KEY, makeRow(edited)),
    ).toBeNull();
  });
});
