import { fabricacionAsistenteRespuestaSchema } from "@/features/fabricacion/schemas/fabricacion-asistente.schema";
import {
  aplicarPropuestaAsistenteFabricacion,
  resumirPropuestaAsistenteFabricacion,
} from "@/features/fabricacion/services/fabricacion-asistente.service";
import { crearRecetaFabricacionVacia } from "@/features/fabricacion/services/fabricacion-receta-editor.service";

describe("asistente estructurado de recetas", () => {
  it("aplica solo datos explicitos y mantiene los vacios como bloqueos", () => {
    const receta = crearRecetaFabricacionVacia({
      recipeIdentityId: "receta-1",
      lineName: "L20",
    });
    const propuesta = fabricacionAsistenteRespuestaSchema.parse({
      resumen: "Se detecto un riel superior.",
      componentes: [
        {
          categoria: "perfil",
          nombre: "Riel superior",
          codigo: "COD-INVENTADO",
          funcion: "Riel superior",
          medidaBase: "ancho_total",
          medidaAltoBase: null,
          multiplicador: 1,
          ajusteMm: -12,
          cantidadTipo: "fija",
          cantidad: 1,
          largoComercialMm: 6000,
          observaciones: "El texto solo indica medida y descuento.",
          faltantes: [],
          explicito: {
            codigo: false,
            medida: true,
            ajuste: true,
            cantidad: false,
            largoComercial: false,
          },
        },
      ],
      preguntas: ["Cuantos rieles superiores usa la abertura?"],
      datosDesconocidos: ["Codigo", "Cantidad", "Largo comercial"],
    });

    const result = aplicarPropuestaAsistenteFabricacion({
      receta,
      propuesta,
      createId: () => "perfil-1",
    });

    expect(result.perfiles[0]).toMatchObject({
      id: "perfil-1",
      codigoPerfil: "",
      largoComercialMm: null,
      reglaMedida: {
        base: "ancho_total",
        multiplicador: 1,
        ajusteMm: -12,
      },
      reglaCantidad: { tipo: "fija", cantidad: 1 },
    });
    expect(result.perfiles[0]?.datosPendientes).toEqual(
      expect.arrayContaining([
        "Confirmar cantidad y regla de cantidad",
        "Confirmar codigo del perfil",
        "Confirmar largo comercial",
      ])
    );
    expect(resumirPropuestaAsistenteFabricacion(propuesta)).toEqual({
      componentes: 1,
      reglasCompletas: 0,
      datosPendientes: 4,
    });
  });

  it("rechaza propiedades fuera del esquema controlado", () => {
    const parsed = fabricacionAsistenteRespuestaSchema.safeParse({
      resumen: "Intento invalido",
      componentes: [],
      preguntas: [],
      datosDesconocidos: [],
      formulaJavascript: "eval('x')",
    });

    expect(parsed.success).toBe(false);
  });
});
