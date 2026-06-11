export type CotizacionDisplayStateInput = {
  estado: string;
  pdfDescargadoEn?: string | null;
};

export type CotizacionDisplayState = {
  cls: string;
  label: string;
};

export type CotizacionClosureState = CotizacionDisplayState;

function normalizeEstado(estado: string) {
  return estado.trim().toLowerCase();
}

export function resolveCotizacionWorkflowState(
  input: CotizacionDisplayStateInput
): CotizacionDisplayState {
  const estado = normalizeEstado(input.estado);

  if (estado === "aprobada") {
    return { cls: "stAprobada", label: "Aprobada" };
  }

  if (estado === "rechazada") {
    return { cls: "stRechazada", label: "Rechazada" };
  }

  if (estado === "terminada") {
    return { cls: "stTerminada", label: "Terminada" };
  }

  if (estado === "enviada") {
    return { cls: "stEnviada", label: "Enviada" };
  }

  if (input.pdfDescargadoEn) {
    return { cls: "stPdfGenerado", label: "PDF generado" };
  }

  if (estado === "borrador") {
    return { cls: "stBorrador", label: "Borrador" };
  }

  return { cls: "stCreada", label: "Creada" };
}

export function resolveCotizacionClosureState(
  input: CotizacionDisplayStateInput
): CotizacionClosureState {
  const estado = normalizeEstado(input.estado);

  if (estado === "aprobada") {
    return { cls: "stAprobada", label: "Aprobada" };
  }

  if (estado === "rechazada") {
    return { cls: "stRechazada", label: "Rechazada" };
  }

  if (estado === "terminada") {
    return { cls: "stTerminada", label: "Terminada" };
  }

  if (input.pdfDescargadoEn) {
    return { cls: "stPdfGenerado", label: "PDF generado" };
  }

  if (estado === "enviada") {
    return { cls: "stEnviada", label: "Enviada" };
  }

  return { cls: "stSinCierre", label: "Sin cierre registrado" };
}
