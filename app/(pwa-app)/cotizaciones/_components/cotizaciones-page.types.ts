export type CotizacionesMobileSummaryKey =
  | "todos"
  | "aprobadas"
  | "pdfGenerados"
  | "rechazadas";

export type CotizacionesMobileSummaryTone = "blue" | "green" | "amber" | "red";

export type CotizacionesMobileSummaryItem = {
  key: CotizacionesMobileSummaryKey;
  label: string;
  value: string;
  tone: CotizacionesMobileSummaryTone;
  active: boolean;
};

export type CotizacionesMobileRow = {
  id: string;
  codigo: string;
  clienteNombre: string;
  obra: string;
  fecha: string;
  total: string;
  detailHref: string;
  cardClassName: string;
  responseMeta: {
    cls: string;
    label: string;
  };
  onPrefetchDetail?: () => void;
};
