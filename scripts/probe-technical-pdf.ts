import { readFileSync } from "node:fs";
import { extractTechnicalPdfCatalog } from "../src/features/cotizaciones/line-templates/services/line-template-pdf-technical.service.ts";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npx tsx scripts/probe-technical-pdf.ts <pdf>");
    process.exit(1);
  }

  const file = readFileSync(pdfPath);
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const result = await extractTechnicalPdfCatalog(buffer);

  console.log(
    JSON.stringify(
      {
        templateId: result.templateId,
        manufacturer: result.manufacturer,
        confidence: result.confidence,
        lineCount: result.lines.length,
        profileCount: result.lines.reduce((sum, line) => sum + line.profiles.length, 0),
        lines: result.lines.map((line) => ({
          nombre: line.nombre,
          profiles: line.profiles.length,
          sampleProfiles: line.profiles.slice(0, 4),
        })),
        warnings: result.warnings,
      },
      null,
      2
    )
  );
}

void main();
