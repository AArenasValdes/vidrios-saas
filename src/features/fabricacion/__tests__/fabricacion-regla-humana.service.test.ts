import {
  describeAccesorioReglaHumana,
  describePerfilCardDisplay,
  describePerfilReglaHumana,
  describePerfilSheetMeasure,
  describePerfilTallerResumen,
  displayLabel,
  getActiveRecipeProfileRules,
  resolveLargoComercialMm,
  resolveRecetaLargoComercialDefaultMm,
  summarizeTirasPorPerfil,
  VENTORA_LARGO_COMERCIAL_PRESET_MM,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type {
  FabricacionAccesorio,
  FabricacionComponentePerfil,
  FabricacionReceta,
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
      "Riel superior — 1 pieza de Ancho de la ventana − 12 mm por ventana — tira 6,00 m"
    );
  });

  it("resume pieza de taller en cortes, medida y descuento", () => {
    expect(describePerfilTallerResumen(profile()).line).toBe(
      "1 corte · Ancho de la ventana · descuento 12 mm"
    );
    expect(describePerfilTallerResumen(profile()).descuentoLabel).toBe(
      "Descuento: -12 mm"
    );
    expect(
      describePerfilTallerResumen(
        profile({
          funcion: "Jamba",
          reglaMedida: { base: "alto_total", ajusteMm: -3 },
          reglaCantidad: { tipo: "fija", cantidad: 2 },
        })
      ).line
    ).toBe("2 cortes · Alto de la ventana · descuento 3 mm");
    expect(
      describePerfilTallerResumen(
        profile({
          reglaMedida: { base: "alto_total", ajusteMm: null },
        })
      ).descuentoLabel
    ).toBe("Falta descuento para corte");
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

  it("resuelve largo comercial con prioridad perfil > receta > Ventora", () => {
    const receta = {
      configuracionCorte: { largoComercialDefaultMm: 5800 },
    } as FabricacionReceta;
    expect(resolveRecetaLargoComercialDefaultMm(receta)).toBe(5800);
    expect(resolveLargoComercialMm(profile({ largoComercialMm: null }), receta)).toBe(
      5800
    );
    expect(
      resolveLargoComercialMm(profile({ largoComercialMm: 6100 }), receta)
    ).toBe(6100);
    expect(
      resolveLargoComercialMm(
        profile({ largoComercialMm: null }),
        {} as FabricacionReceta
      )
    ).toBe(VENTORA_LARGO_COMERCIAL_PRESET_MM);
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

  it("displayLabel nunca interpola objetos", () => {
    expect(displayLabel({ line: "1 corte · Ancho de la ventana" })).toBe(
      "1 corte · Ancho de la ventana"
    );
    expect(displayLabel({ foo: 1 })).toBe("");
    expect(String(displayLabel(describePerfilTallerResumen(profile())))).not.toContain(
      "[object Object]"
    );
    expect(displayLabel("3502")).toBe("3502");
    expect(displayLabel(null)).toBe("");
  });

  it("describe la card de perfil con código, nombre, ajuste y largo", () => {
    const receta = {
      configuracionCorte: { largoComercialDefaultMm: 6000 },
    } as FabricacionReceta;
    const card = describePerfilCardDisplay(
      profile({
        funcion: "Marco",
        codigoPerfil: "3502",
        nombrePerfil: "Riel superior",
        reglaMedida: { base: "ancho_total", ajusteMm: -3 },
        reglaCantidad: { tipo: "fija", cantidad: 1 },
      }),
      receta
    );
    expect(card.rol).toBe("Marco");
    expect(card.perfil).toBe("3502 + Riel superior");
    expect(card.base).toBe("Ancho de la ventana");
    expect(card.ajuste).toBe("−3 mm");
    expect(card.cantidad).toBe("1");
    expect(card.largoComercial).toBe("6,00 m");
    expect(card.line).not.toContain("[object Object]");
  });

  it("excluye reglas inactivas del listado activo", () => {
    const receta = {
      identidad: { hojas: 2, modulos: 1, variante: "estandar" },
      perfiles: [
        profile({ id: "active", requerido: true }),
        profile({
          id: "optional",
          requerido: false,
          reglaMedida: { base: "ancho_total", ajusteMm: 0 },
          reglaCantidad: { tipo: "fija", cantidad: 1 },
        }),
      ],
    } as FabricacionReceta;
    const active = getActiveRecipeProfileRules(receta);
    expect(active.map((entry) => entry.id)).toEqual(["active"]);
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
