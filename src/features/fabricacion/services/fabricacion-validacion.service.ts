import type {
  FabricacionAdvertencia,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";

export type FabricacionValidacionResultado = {
  ok: boolean;
  advertencias: FabricacionAdvertencia[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function structuralMessages(value: unknown): FabricacionAdvertencia[] {
  if (!isRecord(value)) {
    return [
      {
        codigo: "RECETA_SCHEMA_INVALIDO",
        nivel: "error",
        mensaje: "Receta invalida: raiz - debe ser un objeto.",
      },
    ];
  }

  const identidad = value.identidad;
  const requiredArrays = ["perfiles", "vidrios", "accesorios", "notasValidacion"];
  const missingArrays = requiredArrays.filter((key) => !Array.isArray(value[key]));
  const hasIdentity =
    isRecord(identidad) &&
    typeof identidad.recetaId === "string" &&
    typeof identidad.codigo === "string" &&
    typeof identidad.nombre === "string" &&
    typeof identidad.tipologia === "string" &&
    typeof identidad.hojas === "number" &&
    typeof identidad.modulos === "number" &&
    typeof identidad.variante === "string";

  if (!hasIdentity || missingArrays.length > 0 || typeof value.version !== "number") {
    return [
      {
        codigo: "RECETA_SCHEMA_INVALIDO",
        nivel: "error",
        mensaje: "Receta invalida: faltan identidad, version o listas de componentes.",
      },
    ];
  }

  return [];
}

export function validarRecetaFabricacion(value: unknown): FabricacionValidacionResultado {
  const schemaErrors = structuralMessages(value);
  if (schemaErrors.length > 0) {
    return { ok: false, advertencias: schemaErrors };
  }

  const receta = value as FabricacionReceta;
  const advertencias: FabricacionAdvertencia[] = [];
  const allIds = [
    ...receta.perfiles.map((entry) => entry.id),
    ...receta.vidrios.map((entry) => entry.id),
    ...receta.accesorios.map((entry) => entry.id),
  ];
  const duplicated = allIds.filter((id, index) => allIds.indexOf(id) !== index);

  if (duplicated.length > 0) {
    advertencias.push({
      codigo: "RECETA_IDS_DUPLICADOS",
      nivel: "error",
      mensaje: "La receta tiene componentes con identificadores repetidos.",
    });
  }

  receta.perfiles.forEach((perfil) => {
    const hasIdentity = Boolean(
      perfil.funcion.trim() ||
        perfil.nombrePerfil.trim() ||
        perfil.codigoPerfil.trim()
    );
    // El código comercial es opcional: basta función/nombre/referencia.
    if (perfil.requerido && !hasIdentity) {
      advertencias.push({
        codigo: "PERFIL_SIN_IDENTIFICACION",
        nivel: receta.estado === "validada" ? "error" : "advertencia",
        mensaje: `${perfil.funcion || "Perfil"}: falta una función, nombre o referencia.`,
        componenteId: perfil.id,
      });
    }
    // Largo comercial: progresivo (habilita barras), nunca bloquea validación geométrica.
    if (perfil.requerido && !perfil.largoComercialMm) {
      advertencias.push({
        codigo: "PERFIL_SIN_LARGO_COMERCIAL",
        nivel: "advertencia",
        mensaje: `${perfil.funcion || "Perfil"}: agrega el largo comercial para calcular barras.`,
        componenteId: perfil.id,
      });
    }
  });

  [...receta.perfiles, ...receta.vidrios, ...receta.accesorios].forEach(
    (componente) => {
      if ((componente.datosPendientes?.length ?? 0) > 0) {
        advertencias.push({
          codigo: "COMPONENTE_CON_DATOS_PENDIENTES",
          nivel: "advertencia",
          mensaje: `Datos opcionales por confirmar: ${componente.datosPendientes?.join(", ")}.`,
          componenteId: componente.id,
        });
      }
    }
  );

  if (receta.estado === "validada") {
    const corte = receta.configuracionCorte;
    if (
      receta.perfiles.length > 0 &&
      (corte?.perdidaCorteMm == null ||
        corte.despunteInicialMm == null ||
        corte.sobranteMinimoAprovechableMm == null)
    ) {
      advertencias.push({
        codigo: "PAUTA_BARRAS_INCOMPLETA",
        nivel: "advertencia",
        mensaje:
          "Agrega pérdida por corte, despunte y sobrante mínimo para refinar la pauta de barras.",
      });
    }
    if (
      receta.perfiles.length === 0 &&
      receta.vidrios.length === 0 &&
      receta.accesorios.length === 0
    ) {
      advertencias.push({
        codigo: "RECETA_VALIDADA_SIN_COMPONENTES",
        nivel: "error",
        mensaje: "Una receta validada debe tener al menos un componente.",
      });
    }
    if (receta.notasValidacion.length === 0) {
      advertencias.push({
        codigo: "RECETA_VALIDADA_SIN_NOTA",
        nivel: "advertencia",
        mensaje: "La receta esta marcada como validada sin nota de validacion.",
      });
    }
  }

  return {
    ok: !advertencias.some((entry) => entry.nivel === "error"),
    advertencias,
  };
}
