import {
  describeAccesorioReglaHumana,
  describePerfilReglaHumana,
  describePerfilSheetMeasure,
  formatLargoComercialHumano,
  summarizeTirasPorPerfil,
  VENTORA_LARGO_COMERCIAL_PRESET_MM,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type {
  FabricacionAccesorio,
  FabricacionComponentePerfil,
} from "@/features/fabricacion/types/fabricacion-domain";

function profile(
  patch: Partial<FabricacionComponentePerfil> = {}
): FabricacionComponentePerfil {
  return {
    id: "p1",
    codigoPerfil: "",
    nombrePerfil: "Riel",
    funcion: "Riel superior",
    largoComercialMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    reglaMedida: { base: "ancho_total", ajusteMm: -12 },
    reglaCantidad: { tipo: "fija", cantidad: 1 },
    requerido: true,
    ...patch,
  };
}

describe("fabricacion-regla-humana.service", () => {
  it("describe perfil en lenguaje de taller", () => {
    expect(describePerfilReglaHumana(profile())).toBe(
      "Riel superior — 1 pieza de Ancho − 12 mm por ventana — tira 6,00 m"
    );
  });

  it("marca tira por confirmar sin largo", () => {
    expect(formatLargoComercialHumano(null)).toBe("tira por confirmar");
    expect(
      describePerfilReglaHumana(profile({ largoComercialMm: null }))
    ).toContain("tira por confirmar");
  });

  it("describe accesorio humano", () => {
    const accessory: FabricacionAccesorio = {
      id: "a1",
      codigo: "",
      nombre: "Cierres",
      reglaCantidad: { tipo: "fija", cantidad: 2 },
      requerido: true,
    };
    expect(describeAccesorioReglaHumana(accessory)).toBe(
      "2 cierres por ventana"
    );
  });

  it("no marca medida pendiente por confirmar código o largo", () => {
    const sheet = describePerfilSheetMeasure(
      profile({
        datosPendientes: [
          "Confirmar codigo del perfil",
          "Confirmar largo comercial",
        ],
      })
    );
    expect(sheet.pending).toBe(false);
    expect(sheet.measure).toContain("Ancho");
  });

  it("marca medida por configurar cuando falta ajuste", () => {
    const sheet = describePerfilSheetMeasure(
      profile({
        reglaMedida: { base: "ancho_total" },
        datosPendientes: ["Confirmar ajuste o descuento en mm"],
      })
    );
    expect(sheet.pending).toBe(true);
    expect(sheet.measure).toContain("Medida por configurar");
  });

  it("agrupa tiras por perfil y largo", () => {
    const groups = summarizeTirasPorPerfil([
      {
        codigoPerfil: "RIEL",
        nombrePerfil: "Riel superior",
        largoComercialMm: 6000,
        usadoMm: 3000,
        sobranteMm: 3000,
      },
      {
        codigoPerfil: "RIEL",
        nombrePerfil: "Riel superior",
        largoComercialMm: 6000,
        usadoMm: 2800,
        sobranteMm: 3200,
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.tiras).toBe(2);
    expect(groups[0]?.usadoMm).toBe(5800);
  });
});
