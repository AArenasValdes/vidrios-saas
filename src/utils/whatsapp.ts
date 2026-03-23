import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function normalizeWhatsappPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("56") && digits.length >= 11) {
    return digits;
  }

  if (digits.startsWith("9") && digits.length === 9) {
    return `56${digits}`;
  }

  if (digits.startsWith("09") && digits.length === 10) {
    return `56${digits.slice(1)}`;
  }

  if (digits.length >= 8) {
    return digits;
  }

  return null;
}

type BuildCotizacionWhatsappOptions = {
  approvalUrl?: string | null;
  pdfUrl?: string | null;
};

export function buildCotizacionWhatsappMessage(
  record: CotizacionWorkflowRecord,
  options: BuildCotizacionWhatsappOptions = {}
) {
  const approvalUrl =
    options.approvalUrl ??
    (record.approvalToken ? buildCotizacionApprovalUrl(record.approvalToken) : null);
  const pdfUrl = options.pdfUrl ?? null;

  return [
    `Hola ${record.clienteNombre},`,
    `te envio la cotizacion ${record.codigo}.`,
    `Total ${formatCurrency(record.total)}.`,
    `Vigencia ${record.validez}.`,
    pdfUrl ? `Descargar PDF: ${pdfUrl}` : null,
    approvalUrl ? `Puedes revisar, aceptar o rechazar aqui: ${approvalUrl}` : null,
    "Quedo atento a tu confirmacion.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCotizacionWhatsappUrl(
  record: CotizacionWorkflowRecord,
  options: BuildCotizacionWhatsappOptions = {}
) {
  const phone = normalizeWhatsappPhone(record.clienteTelefono);

  if (!phone) {
    return null;
  }

  const message = buildCotizacionWhatsappMessage(record, options);

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
