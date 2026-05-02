import type {
  ClienteCotizacionResumen,
  ClienteDetalle,
  ClienteProyectoResumen,
} from "@/features/clientes/types/cliente";

type ClienteDetalleTab = "proyectos" | "cotizaciones";

type EstadoBadgeModel = {
  label: string;
  tone: "green" | "orange" | "gray" | "blue";
};

type ProyectoRowModel = {
  id: string;
  titulo: string;
  cotizacionesLabel: string;
  actividadLabel: string;
  estado: EstadoBadgeModel;
};

type CotizacionRowModel = {
  id: string;
  href: string;
  codigo: string;
  fecha: string;
  total: string;
  estado: EstadoBadgeModel;
};

export type ClienteDetalleMobileViewModel = {
  backHref: string;
  editHref: string;
  label: string;
  title: string;
  estado: EstadoBadgeModel;
  telefono: string;
  telefonoHref: string | null;
  direccion: string;
  updatedLine: string;
  totalCotizado: string;
  totalCotizadoLabel: string;
  totalCotizaciones: string;
  totalCotizacionesLabel: string;
  totalProyectos: string;
  totalProyectosLabel: string;
  defaultTab: ClienteDetalleTab;
  tabs: Array<{
    id: ClienteDetalleTab;
    label: string;
    count: string;
  }>;
  proyectos: ProyectoRowModel[];
  cotizaciones: CotizacionRowModel[];
};

const shortDateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
});

const monthYearFormatter = new Intl.DateTimeFormat("es-CL", {
  month: "short",
  year: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function normalizeLabel(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatCompactCurrency(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `$ ${new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)} Mill`;
  }

  if (abs >= 1_000) {
    return `$ ${new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 1_000)} mil`;
  }

  return currencyFormatter.format(value);
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "--";
  }

  return shortDateFormatter.format(new Date(value)).replace(".", "");
}

function formatProjectActivity(value: string | null) {
  if (!value) {
    return "Sin actividad";
  }

  const date = new Date(value);
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return `Hace ${Math.max(1, diffDays)} dias`;
  }

  if (diffDays <= 28) {
    return `Hace ${Math.max(1, Math.round(diffDays / 7))} sem`;
  }

  return monthYearFormatter.format(date).replace(".", "");
}

function mapClienteEstado(value: string): EstadoBadgeModel {
  const normalized = normalizeLabel(value);

  if (normalized === "activo") {
    return { label: "Activo", tone: "green" };
  }

  if (normalized === "seguimiento" || normalized === "prospecto") {
    return { label: "Activo", tone: "green" };
  }

  return { label: "Activo", tone: "green" };
}

function mapProyectoEstado(value: string | null): EstadoBadgeModel {
  const normalized = normalizeLabel(value ?? "");

  if (
    normalized.includes("cerrado") ||
    normalized.includes("terminado") ||
    normalized.includes("finalizado") ||
    normalized.includes("inactivo")
  ) {
    return { label: "Cerrado", tone: "gray" };
  }

  if (normalized.includes("pausado") || normalized.includes("prospecto")) {
    return { label: "Pausado", tone: "orange" };
  }

  return { label: "En curso", tone: "green" };
}

function mapCotizacionEstado(value: string): EstadoBadgeModel {
  const normalized = normalizeLabel(value);

  if (normalized === "aprobada") {
    return { label: "Aprobada", tone: "green" };
  }

  if (normalized === "rechazada") {
    return { label: "Rechazada", tone: "gray" };
  }

  if (normalized === "enviada") {
    return { label: "Enviada", tone: "blue" };
  }

  if (normalized === "borrador" || normalized === "creada" || normalized === "pendiente") {
    return { label: "Pendiente", tone: "orange" };
  }

  return { label: value || "Pendiente", tone: "orange" };
}

function buildUpdatedLine(detalle: ClienteDetalle) {
  const updatedAt =
    detalle.cliente.actualizadoEn ??
    detalle.resumen.ultimaGestionAt ??
    detalle.cliente.creadoEn;

  if (!updatedAt) {
    return "Actualizada recientemente · Vigencia 15 dias";
  }

  return `Actualizada ${fullDateFormatter
    .format(new Date(updatedAt))
    .replace(".", "")} · Vigencia 15 dias`;
}

function mapProyecto(project: ClienteProyectoResumen): ProyectoRowModel {
  return {
    id: String(project.id),
    titulo: project.titulo,
    cotizacionesLabel: `${project.cotizaciones} cotiz.`,
    actividadLabel: formatProjectActivity(project.ultimaActividadAt),
    estado: mapProyectoEstado(project.estado),
  };
}

function mapCotizacion(quote: ClienteCotizacionResumen): CotizacionRowModel {
  return {
    id: String(quote.id),
    href: `/cotizaciones/${quote.id}`,
    codigo: quote.codigo,
    fecha: formatShortDate(quote.updatedAt),
    total: currencyFormatter.format(quote.total),
    estado: mapCotizacionEstado(quote.estado),
  };
}

export function buildClienteDetalleMobileViewModel(
  detalle: ClienteDetalle
): ClienteDetalleMobileViewModel {
  const totalCotizado = detalle.cotizaciones.reduce(
    (accumulator, cotizacion) => accumulator + cotizacion.total,
    0
  );

  return {
    backHref: "/clientes",
    editHref: `/clientes/${detalle.cliente.id}/editar`,
    label: "Ficha de cliente",
    title: detalle.cliente.nombre,
    estado: mapClienteEstado(detalle.resumen.estado),
    telefono: detalle.cliente.telefono ?? "Sin telefono",
    telefonoHref: detalle.cliente.telefono ? `tel:${detalle.cliente.telefono}` : null,
    direccion: detalle.cliente.direccion ?? "Sin direccion",
    updatedLine: buildUpdatedLine(detalle),
    totalCotizado: formatCompactCurrency(totalCotizado),
    totalCotizadoLabel: "Cotizado",
    totalCotizaciones: String(detalle.cotizaciones.length),
    totalCotizacionesLabel: "Cotiz.",
    totalProyectos: String(detalle.proyectos.length),
    totalProyectosLabel: "Proyectos",
    defaultTab: "proyectos",
    tabs: [
      {
        id: "proyectos",
        label: "Proyectos",
        count: String(detalle.proyectos.length),
      },
      {
        id: "cotizaciones",
        label: "Cotizaciones",
        count: String(detalle.cotizaciones.length),
      },
    ],
    proyectos: detalle.proyectos.map(mapProyecto),
    cotizaciones: detalle.cotizaciones.map(mapCotizacion),
  };
}
