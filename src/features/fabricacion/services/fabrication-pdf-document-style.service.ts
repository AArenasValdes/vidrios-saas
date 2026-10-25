import type { jsPDF } from "jspdf";

export type FabricationPdfMetadata = {
  companyName: string;
  quoteCode: string;
  workName: string;
  issueDate: string;
};

export const FABRICATION_PDF_COLORS = {
  ink: [14, 35, 76] as [number, number, number],
  muted: [76, 96, 121] as [number, number, number],
  blue: [30, 136, 255] as [number, number, number],
  rule: [216, 224, 234] as [number, number, number],
  pale: [245, 248, 252] as [number, number, number],
  row: [250, 251, 253] as [number, number, number],
};

const PAGE_WIDTH = 210;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function clean(value: string | null | undefined, fallback = "Pendiente") {
  return value?.trim() || fallback;
}

function drawLogo(pdf: jsPDF, logoDataUrl?: string | null, y = 10) {
  if (logoDataUrl) {
    try {
      const image = pdf.getImageProperties(logoDataUrl);
      const scale = Math.min(42 / image.width, 9 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      pdf.addImage(logoDataUrl, "PNG", MARGIN, y, width, height, undefined, "FAST");
      return y + height;
    } catch {
      throw new Error("No se pudo insertar el logotipo corporativo en el PDF. Recarga la página e inténtalo otra vez.");
    }
  }
  return y;
}

export function drawFabricationPdfHeader(
  pdf: jsPDF,
  metadata: FabricationPdfMetadata,
  title: string,
  logoDataUrl?: string | null,
  clientLabel = "Empresa"
) {
  const logoBottom = drawLogo(pdf, logoDataUrl, 9);
  const labelY = Math.max(22, logoBottom + 4);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...FABRICATION_PDF_COLORS.muted);
  pdf.text("Documento de fabricación", MARGIN, labelY);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...FABRICATION_PDF_COLORS.ink);
  const titleLines = pdf.splitTextToSize(title, CONTENT_WIDTH) as string[];
  const titleY = labelY + 8;
  pdf.text(titleLines, MARGIN, titleY, { lineHeightFactor: 1.12 });
  const titleHeight = Math.max(6.5, titleLines.length * 7.1);
  const ruleY = titleY + titleHeight + 2;
  pdf.setDrawColor(...FABRICATION_PDF_COLORS.blue);
  pdf.setLineWidth(0.45);
  pdf.line(MARGIN, ruleY, PAGE_WIDTH - MARGIN, ruleY);

  const values = [
    { label: "Cotización", value: clean(metadata.quoteCode) },
    { label: clientLabel, value: clean(metadata.companyName, clientLabel) },
    { label: "Trabajo", value: clean(metadata.workName, "Sin nombre") },
    { label: "Emisión", value: clean(metadata.issueDate) },
  ];
  const top = ruleY + 4;
  const columnWidth = CONTENT_WIDTH / values.length;
  let metadataHeight = 16;
  const prepared = values.map((value) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.7);
    const lines = pdf.splitTextToSize(value.value, columnWidth - 5) as string[];
    metadataHeight = Math.max(metadataHeight, 7 + lines.length * 3.8);
    return { ...value, lines };
  });
  pdf.setFillColor(...FABRICATION_PDF_COLORS.pale);
  pdf.roundedRect(MARGIN, top, CONTENT_WIDTH, metadataHeight, 1, 1, "F");
  prepared.forEach((value, index) => {
    const x = MARGIN + index * columnWidth + 3;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...FABRICATION_PDF_COLORS.muted);
    pdf.text(value.label, x, top + 4.5);
    pdf.setFontSize(8.7);
    pdf.setTextColor(...FABRICATION_PDF_COLORS.ink);
    pdf.text(value.lines, x, top + 10, { lineHeightFactor: 1.12 });
  });
  return top + metadataHeight + 6;
}

export function drawFabricationPdfContinuationHeader(pdf: jsPDF, title: string, quoteCode: string, logoDataUrl?: string | null) {
  drawLogo(pdf, logoDataUrl, 8);
  const titleX = MARGIN + 48;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...FABRICATION_PDF_COLORS.ink);
  pdf.text(title, titleX, 15, { maxWidth: PAGE_WIDTH - MARGIN - titleX });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...FABRICATION_PDF_COLORS.muted);
  pdf.text(`${clean(quoteCode)} · continuación`, MARGIN, 23);
  pdf.setDrawColor(...FABRICATION_PDF_COLORS.rule);
  pdf.setLineWidth(0.25);
  pdf.line(MARGIN, 27, PAGE_WIDTH - MARGIN, 27);
  return 33;
}

export function drawFabricationPdfFooters(pdf: jsPDF, quoteCode: string) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...FABRICATION_PDF_COLORS.rule);
    pdf.setLineWidth(0.25);
    pdf.line(MARGIN, 283, PAGE_WIDTH - MARGIN, 283);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...FABRICATION_PDF_COLORS.muted);
    pdf.text(`VENTORA · FABRICACIÓN · ${clean(quoteCode)}`, MARGIN, 288);
    pdf.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH - MARGIN, 288, { align: "right" });
  }
}

export function drawFabricationPdfSectionTitle(pdf: jsPDF, title: string, y: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...FABRICATION_PDF_COLORS.ink);
  pdf.text(title, MARGIN, y);
  return y + 5;
}
