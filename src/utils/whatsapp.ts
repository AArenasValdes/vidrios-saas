import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function extractValidezDays(validez: string) {
  const match = validez.match(/\d+/);
  return match?.[0] ?? validez.trim();
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
  deliveryMode?: "attachment" | "link" | "message";
};

export function buildCotizacionWhatsappMessage(
  record: CotizacionWorkflowRecord,
  options: BuildCotizacionWhatsappOptions = {}
) {
  const approvalUrl =
    options.approvalUrl ??
    (record.approvalToken ? buildCotizacionApprovalUrl(record.approvalToken) : null);
  const pdfUrl = options.pdfUrl ?? null;
  const deliveryMode = options.deliveryMode ?? (pdfUrl ? "link" : "message");
  const quoteContext = record.obra?.trim() ? ` para ${record.obra.trim()}.` : ".";
  const validezDays = extractValidezDays(record.validez);

  const publicLinkBlock =
    deliveryMode === "attachment"
      ? approvalUrl
        ? `Ver cotizacion:\n${approvalUrl}`
        : null
      : pdfUrl
        ? `Ver cotizacion:\n${pdfUrl}`
        : approvalUrl
          ? `Ver cotizacion:\n${approvalUrl}`
          : null;

  return [
    `Hola ${record.clienteNombre},`,
    "",
    `Te enviamos tu cotizacion${quoteContext}`,
    "",
    `Total: ${formatCurrency(record.total)}`,
    `Vigencia: ${validezDays} dias`,
    "",
    publicLinkBlock,
    "",
    "Puedes aprobar o rechazar directamente desde el enlace.",
    "",
    "Quedamos atentos.",
  ]
    .filter(Boolean)
    .join("\n");
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
