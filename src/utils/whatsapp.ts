import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import { normalizeChileMobilePhone } from "@/utils/chile-mobile-phone";
import { formatCurrency } from "@/utils/formatCurrency";

function extractValidezDays(validez: string) {
  const match = validez.match(/\d+/);
  return match?.[0] ?? validez.trim();
}

export function normalizeWhatsappPhone(phone: string) {
  const normalizedChileMobile = normalizeChileMobilePhone(phone);

  if (normalizedChileMobile) {
    return normalizedChileMobile.replace(/^\+/, "");
  }

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

type BuildPublicLeadWhatsappOptions = {
  nombre?: string;
  tipoTrabajo?: string;
  mensaje?: string | null;
};

export function buildPublicLeadWhatsappMessage(
  options: BuildPublicLeadWhatsappOptions = {}
) {
  const tipoTrabajo = options.tipoTrabajo?.trim();
  const nombre = options.nombre?.trim();
  const mensaje = options.mensaje?.trim();

  const firstLine = tipoTrabajo
    ? `Hola, vengo desde su enlace de cotización. Quiero consultar por: ${tipoTrabajo}.`
    : "Hola, vengo desde su enlace de cotización y quiero hacer una consulta.";

  return [firstLine, nombre ? `Mi nombre es ${nombre}.` : null, mensaje || null]
    .filter(Boolean)
    .join("\n");
}

export function buildPublicLeadWhatsappUrl(
  phone: string,
  options: BuildPublicLeadWhatsappOptions = {}
) {
  const normalizedPhone = normalizeWhatsappPhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  const message = buildPublicLeadWhatsappMessage(options);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
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
  const validezDays = extractValidezDays(record.validez ?? "15 dias");

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
  const responseInstruction = publicLinkBlock
    ? "Puedes aprobar o rechazar directamente desde el enlace."
    : "Si quieres avanzar o revisar ajustes, responde a este mensaje y la empresa seguira contigo.";

  return [
    `Hola ${record.clienteNombre},`,
    "",
    `Te enviamos tu cotizacion${quoteContext}`,
    "",
    `Total: ${formatCurrency(record.total ?? 0)}`,
    `Vigencia: ${validezDays} dias`,
    "",
    publicLinkBlock,
    "",
    responseInstruction,
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
