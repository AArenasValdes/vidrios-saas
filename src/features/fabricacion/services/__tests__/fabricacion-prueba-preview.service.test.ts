import type { FabricacionResultadoCubicacion } from "@/features/fabricacion/types/fabricacion-domain";
import {
  obtenerFeedbackPruebaFabricacion,
  resolverFeedbackVisiblePruebaFabricacion,
} from "../fabricacion-prueba-preview.service";

function crearResultado(
  overrides: Partial<FabricacionResultadoCubicacion> = {}
): FabricacionResultadoCubicacion {
  return {
    engineVersion: 1,
    recetaId: "receta-prueba",
    recetaVersion: 1,
    estadoReceta: "draft",
    entradaNormalizada: null,
    perfiles: [],
    vidrios: [],
    accesorios: [],
    advertencias: [],
    totalLinealMm: 0,
    totalVidrioM2: 0,
    calculable: false,
    ...overrides,
  } as FabricacionResultadoCubicacion;
}

describe("feedback de prueba de fabricación", () => {
  it("permite mostrar resultados aunque la receta draft tenga datos pendientes", () => {
    const feedback = obtenerFeedbackPruebaFabricacion(
      crearResultado({
        perfiles: [
          {
            componenteId: "marco",
            codigoPerfil: "P-1",
            nombrePerfil: "Marco",
            funcion: "Marco",
            medidaMm: 1000,
            cantidadPiezas: 1,
            totalLinealMm: 1000,
            trazabilidad: [],
          },
        ],
        advertencias: [
          {
            codigo: "RECETA_DATOS_PENDIENTES",
            nivel: "advertencia",
            mensaje: "Falta confirmar un dato con el taller.",
          },
        ],
      })
    );

    expect(feedback).toBeNull();
  });

  it("explica errores reales de cálculo en vez de ocultarlos", () => {
    const feedback = obtenerFeedbackPruebaFabricacion(
      crearResultado({
        perfiles: [
          {
            componenteId: "marco",
            codigoPerfil: "P-1",
            nombrePerfil: "Marco",
            funcion: "Marco",
            medidaMm: 1000,
            cantidadPiezas: 1,
            totalLinealMm: 1000,
            trazabilidad: [],
          },
        ],
        advertencias: [
          {
            codigo: "MEDIDA_INVALIDA",
            nivel: "error",
            mensaje: "La medida calculada debe ser mayor que cero.",
          },
        ],
      })
    );

    expect(feedback).toContain("La medida calculada debe ser mayor que cero.");
  });

  it("avisa cuando no hay medidas calculadas para mostrar", () => {
    expect(obtenerFeedbackPruebaFabricacion(crearResultado())).toBe(
      "No se pudo calcular con estas medidas. Revisa la configuración."
    );
  });

  it("retira un aviso antiguo de HMR cuando la pantalla conserva una pauta con resultados", () => {
    const resultado = crearResultado({
      perfiles: [
        {
          componenteId: "marco",
          codigoPerfil: "P-1",
          nombrePerfil: "Marco",
          funcion: "Marco",
          medidaMm: 1000,
          cantidadPiezas: 1,
          totalLinealMm: 1000,
          trazabilidad: [],
        },
      ],
      advertencias: [
        {
          codigo: "RECETA_DATOS_PENDIENTES",
          nivel: "advertencia",
          mensaje: "Falta confirmar un dato con el taller.",
        },
      ],
    });

    expect(
      resolverFeedbackVisiblePruebaFabricacion(
        "No se pudo calcular con estas medidas. Revisa la configuración.",
        resultado
      )
    ).toBeNull();
  });
});
