import type { FabricacionAsistenteRespuesta } from "@/features/fabricacion/schemas/fabricacion-asistente.schema";
import type {
  FabricacionBaseMedida,
  FabricacionReceta,
  FabricacionReglaCantidad,
} from "@/features/fabricacion/types/fabricacion-domain";

export function resumirPropuestaAsistenteFabricacion(
  propuesta: FabricacionAsistenteRespuesta
) {
  const reglasCompletas = propuesta.componentes.filter((component) => {
    if (component.categoria === "accesorio") {
      return component.explicito.cantidad;
    }
    return (
      component.explicito.medida &&
      component.explicito.ajuste &&
      component.explicito.cantidad
    );
  }).length;
  const datosPendientes = unique([
    ...propuesta.preguntas,
    ...propuesta.datosDesconocidos,
    ...propuesta.componentes.flatMap((component) => component.faltantes),
  ]).length;

  return {
    componentes: propuesta.componentes.length,
    reglasCompletas,
    datosPendientes,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function quantityRule(input: {
  explicit: boolean;
  type: FabricacionReglaCantidad["tipo"] | null;
  quantity: number | null;
}): { rule: FabricacionReglaCantidad; pending: string[] } {
  if (!input.explicit || !input.type || input.quantity == null) {
    return {
      rule: { tipo: "fija", cantidad: 1, multiplicador: 1 },
      pending: ["Confirmar cantidad y regla de cantidad"],
    };
  }
  return {
    rule: { tipo: input.type, cantidad: input.quantity, multiplicador: 1 },
    pending: [],
  };
}

function measureRule(input: {
  explicit: boolean;
  base: FabricacionBaseMedida | null;
  multiplier: number | null;
  adjustment: number | null;
}) {
  const pending: string[] = [];
  if (!input.explicit || !input.base) pending.push("Confirmar medida base");
  if (input.adjustment == null) pending.push("Confirmar ajuste de corte");
  return {
    rule: {
      base: input.explicit && input.base ? input.base : ("ancho_total" as const),
      multiplicador:
        input.explicit && input.multiplier != null ? input.multiplier : 1,
      ajusteMm:
        input.explicit && input.adjustment != null ? input.adjustment : 0,
    },
    pending,
  };
}

export function aplicarPropuestaAsistenteFabricacion(input: {
  receta: FabricacionReceta;
  propuesta: FabricacionAsistenteRespuesta;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const perfiles = [...input.receta.perfiles];
  const vidrios = [...input.receta.vidrios];
  const accesorios = [...input.receta.accesorios];

  input.propuesta.componentes.forEach((component) => {
    const quantity = quantityRule({
      explicit: component.explicito.cantidad,
      type: component.cantidadTipo,
      quantity: component.cantidad,
    });
    const pending = [...component.faltantes, ...quantity.pending];

    if (component.categoria === "accesorio") {
      accesorios.push({
        id: createId(),
        codigo: component.explicito.codigo ? component.codigo ?? "" : "",
        nombre: component.nombre,
        reglaCantidad: quantity.rule,
        requerido: true,
        observaciones: component.observaciones,
        datosPendientes: unique([
          ...pending,
          ...(component.explicito.codigo ? [] : ["Confirmar codigo del accesorio"]),
        ]),
      });
      return;
    }

    const measure = measureRule({
      explicit: component.explicito.medida,
      base: component.medidaBase,
      multiplier: component.multiplicador,
      adjustment: component.explicito.ajuste ? component.ajusteMm : null,
    });

    if (component.categoria === "vidrio") {
      const height = measureRule({
        explicit: component.explicito.medida,
        base: component.medidaAltoBase,
        multiplier: component.multiplicador,
        adjustment: component.explicito.ajuste ? component.ajusteMm : null,
      });
      vidrios.push({
        id: createId(),
        nombre: component.nombre,
        reglaAncho: measure.rule,
        reglaAlto: height.rule,
        reglaCantidad: quantity.rule,
        requerido: true,
        observaciones: component.observaciones,
        datosPendientes: unique([...pending, ...measure.pending, ...height.pending]),
      });
      return;
    }

    perfiles.push({
      id: createId(),
      codigoPerfil: component.explicito.codigo ? component.codigo ?? "" : "",
      nombrePerfil: component.nombre,
      funcion: component.funcion,
      largoComercialMm: component.explicito.largoComercial
        ? component.largoComercialMm
        : null,
      reglaMedida: measure.rule,
      reglaCantidad: quantity.rule,
      requerido: true,
      observaciones: component.observaciones,
      datosPendientes: unique([
        ...pending,
        ...measure.pending,
        ...(component.explicito.codigo ? [] : ["Confirmar codigo del perfil"]),
        ...(component.explicito.largoComercial
          ? []
          : ["Confirmar largo comercial"]),
      ]),
    });
  });

  return {
    ...input.receta,
    perfiles,
    vidrios,
    accesorios,
    notasValidacion: unique([
      ...input.receta.notasValidacion,
      "Borrador generado desde texto. Revisar todos los datos pendientes antes de probar.",
    ]),
  };
}
