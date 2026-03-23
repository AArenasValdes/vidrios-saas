import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";

function escapeCsv(value: string) {
  const normalized = value.replaceAll('"', '""');

  return `"${normalized}"`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function buildCsv(records: CotizacionWorkflowRecord[]) {
  const header = [
    "Codigo",
    "Cliente",
    "Obra",
    "Fecha",
    "Estado",
    "Subtotal",
    "IVA",
    "Total",
  ];
  const rows = records.map((record) => [
    record.codigo,
    record.clienteNombre,
    record.obra,
    record.updatedAt.slice(0, 10),
    record.estado,
    formatCurrency(record.subtotal),
    formatCurrency(record.iva),
    formatCurrency(record.total),
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n");
}

export function downloadCotizacionesListCsv(
  records: CotizacionWorkflowRecord[],
  title = "Listado de cotizaciones"
) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const csv = `\uFEFF${buildCsv(records)}`;
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = `${slugify(title || "listado-cotizaciones") || "listado-cotizaciones"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
