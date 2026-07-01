import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import {
  isSupportedSpreadsheetFileName,
  mapSpreadsheetRowsToProspects,
  parseSpreadsheetUpload,
  SUPPORTED_SPREADSHEET_EXTENSIONS,
} from "@/features/growth/services/growth-import-spreadsheet.service";
import { createGrowthProspect } from "@/features/growth/services/growth-prospects.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import { loadGrowthWorkspace } from "@/features/growth/services/growth-workspace.service";
import type { GrowthImportResult } from "@/features/growth/types/growth-supabase";

export async function POST(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }

    if (!isSupportedSpreadsheetFileName(file.name)) {
      return NextResponse.json(
        {
          error: `Formato no soportado. Usa ${SUPPORTED_SPREADSHEET_EXTENSIONS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const rows = parseSpreadsheetUpload({
      fileName: file.name,
      text: isExcel ? undefined : await file.text(),
      buffer: isExcel ? await file.arrayBuffer() : undefined,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No encontramos filas válidas. Revisa que la primera fila tenga encabezados como Empresa, Contacto y WhatsApp.",
        },
        { status: 400 }
      );
    }

    const prospects = mapSpreadsheetRowsToProspects(rows);

    const result: GrowthImportResult = {
      imported: 0,
      updated: 0,
      skipped: rows.length - prospects.length,
      errors: [],
    };

    for (const prospect of prospects) {
      try {
        await createGrowthProspect(context, prospect);
        result.imported += 1;
      } catch (error) {
        result.errors.push(
          `${prospect.empresa}: ${error instanceof Error ? error.message : "error"}`
        );
      }
    }

    const workspace = await loadGrowthWorkspace(context);
    return NextResponse.json({ result, workspace, parsedRows: rows.length });
  } catch (error) {
    return growthApiError(error, "No pudimos importar el archivo.");
  }
}
