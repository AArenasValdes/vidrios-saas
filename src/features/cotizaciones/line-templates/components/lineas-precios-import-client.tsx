"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuArrowLeft, LuFileUp, LuUpload } from "react-icons/lu";

import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import {
  buildLineTemplateImportPreview,
  countImportPreviewSummary,
  extractSpreadsheetHeaders,
  isSupportedLineTemplateImportFileName,
  LINE_TEMPLATE_IMPORT_FIELDS,
  listXlsxSheetNames,
  parseLineTemplateSpreadsheetUpload,
  suggestLineTemplateColumnMapping,
  type LineTemplateColumnMapping,
  type LineTemplateImportPreviewRow,
  type LineTemplateSpreadsheetRow,
} from "@/features/cotizaciones/line-templates/services/line-template-import.service";
import {
  extractPdfCatalogImportData,
  mergeSelectedPdfPageRows,
  resolveDefaultPdfPageSelection,
  type PdfCatalogPageExtraction,
  type PdfExtractionConfidence,
} from "@/features/cotizaciones/line-templates/services/line-template-pdf-import.service";
import {
  extractTechnicalPdfCatalog,
  shouldPreferTechnicalPdfImport,
  type TechnicalCatalogExtractionResult,
} from "@/features/cotizaciones/line-templates/services/line-template-pdf-technical.service";
import { buildTechnicalLineTemplateImportPreview } from "@/features/cotizaciones/line-templates/services/line-template-technical-import.service";
import type {
  LineTemplateImportDuplicateMode,
  LineTemplateImportResult,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./lineas-precios-import-client.module.css";

type ImportStep = "upload" | "mapping" | "preview" | "done";
type PdfImportMode = "commercial" | "technical";

const CONFIDENCE_LABELS: Record<PdfExtractionConfidence | "high" | "medium" | "low", string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

function isPdfFileName(fileName: string) {
  return fileName.trim().toLowerCase().endsWith(".pdf");
}

export function LineasPreciosImportClient() {
  const { templates, isSaving, importTemplates } = useCotizacionLineTemplates();
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rows, setRows] = useState<LineTemplateSpreadsheetRow[]>([]);
  const [mapping, setMapping] = useState<LineTemplateColumnMapping>({});
  const [duplicateMode, setDuplicateMode] =
    useState<LineTemplateImportDuplicateMode>("skip");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<LineTemplateImportResult | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfImportMode, setPdfImportMode] = useState<PdfImportMode>("commercial");
  const [pdfPages, setPdfPages] = useState<PdfCatalogPageExtraction[]>([]);
  const [selectedPdfPages, setSelectedPdfPages] = useState<number[]>([]);
  const [pdfWarnings, setPdfWarnings] = useState<string[]>([]);
  const [pdfConfidence, setPdfConfidence] = useState<PdfExtractionConfidence | null>(null);
  const [technicalExtraction, setTechnicalExtraction] =
    useState<TechnicalCatalogExtractionResult | null>(null);

  const isPdfImport = isPdfFileName(fileName);
  const isTechnicalImport = pdfImportMode === "technical";

  const headers = useMemo(() => extractSpreadsheetHeaders(rows), [rows]);
  const commercialPreviewRows = useMemo(
    () =>
      buildLineTemplateImportPreview({
        rows,
        mapping,
        existingTemplates: templates,
      }),
    [mapping, rows, templates]
  );
  const technicalPreviewRows = useMemo(
    () =>
      technicalExtraction
        ? buildTechnicalLineTemplateImportPreview({
            lines: technicalExtraction.lines,
            existingTemplates: templates,
            manufacturer: technicalExtraction.manufacturer,
            templateId: technicalExtraction.templateId,
            sourceFileName: fileName,
          })
        : [],
    [fileName, technicalExtraction, templates]
  );
  const previewRows = isTechnicalImport ? technicalPreviewRows : commercialPreviewRows;
  const previewSummary = useMemo(() => countImportPreviewSummary(previewRows), [previewRows]);
  const importableRows = useMemo(
    () =>
      previewRows.filter(
        (row) =>
          row.payload &&
          (row.status === "ready" ||
            row.status === "duplicate" ||
            row.status === "technical" ||
            row.status === "price_match")
      ),
    [previewRows]
  );

  const stepItems = isTechnicalImport
    ? [
        { id: "upload", label: "Archivo" },
        { id: "preview", label: "Vista previa" },
        { id: "done", label: "Resultado" },
      ]
    : [
        { id: "upload", label: "Archivo" },
        { id: "mapping", label: "Columnas" },
        { id: "preview", label: "Vista previa" },
        { id: "done", label: "Resultado" },
      ];

  const applySpreadsheetRows = (parsedRows: LineTemplateSpreadsheetRow[]) => {
    setRows(parsedRows);
    setMapping(suggestLineTemplateColumnMapping(extractSpreadsheetHeaders(parsedRows)));
    setStep(parsedRows.length > 0 ? "mapping" : "upload");
    if (parsedRows.length === 0) {
      setFeedback("No encontramos filas con datos en el archivo.");
    }
  };

  const resetPdfState = () => {
    setPdfPages([]);
    setSelectedPdfPages([]);
    setPdfWarnings([]);
    setPdfConfidence(null);
    setTechnicalExtraction(null);
    setIsExtractingPdf(false);
    setPdfImportMode("commercial");
  };

  const applyTechnicalExtraction = (extraction: TechnicalCatalogExtractionResult) => {
    setTechnicalExtraction(extraction);
    setPdfWarnings(extraction.warnings);
    setPdfConfidence(extraction.confidence);
    setRows([]);
    setMapping({});
    setStep(extraction.lines.length > 0 ? "preview" : "upload");
    if (extraction.lines.length === 0) {
      setFeedback("No detectamos lineas tecnicas en el PDF.");
    }
  };

  const applyPdfExtraction = (
    pages: PdfCatalogPageExtraction[],
    selectedPages: number[],
    warnings: string[],
    overallConfidence: PdfExtractionConfidence
  ) => {
    setPdfPages(pages);
    setSelectedPdfPages(selectedPages);
    setPdfWarnings(warnings);
    setPdfConfidence(overallConfidence);
    setTechnicalExtraction(null);
    applySpreadsheetRows(mergeSelectedPdfPageRows(pages, selectedPages));
  };

  const handlePdfPageToggle = (pageNumber: number, checked: boolean) => {
    const nextSelection = checked
      ? [...new Set([...selectedPdfPages, pageNumber])].sort((left, right) => left - right)
      : selectedPdfPages.filter((page) => page !== pageNumber);

    setSelectedPdfPages(nextSelection);
    applySpreadsheetRows(mergeSelectedPdfPageRows(pdfPages, nextSelection));
  };

  const processPdfBuffer = async (nextBuffer: ArrayBuffer, fileLabel: string, mode?: PdfImportMode) => {
    setIsExtractingPdf(true);

    try {
      const [priceExtraction, technicalResult] = await Promise.all([
        extractPdfCatalogImportData(nextBuffer),
        extractTechnicalPdfCatalog(nextBuffer),
      ]);

      const resolvedMode =
        mode ??
        (shouldPreferTechnicalPdfImport({
          technicalLineCount: technicalResult.lines.length,
          priceRowCount: priceExtraction.mergedRows.length,
        })
          ? "technical"
          : "commercial");

      setPdfImportMode(resolvedMode);

      if (resolvedMode === "technical") {
        applyTechnicalExtraction(technicalResult);
        return;
      }

      const defaultPages = resolveDefaultPdfPageSelection(priceExtraction.pages);
      applyPdfExtraction(
        priceExtraction.pages,
        defaultPages,
        priceExtraction.warnings,
        priceExtraction.overallConfidence
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "No pudimos leer el PDF. Prueba CSV/Excel o un PDF con texto seleccionable."
      );
      setStep("upload");
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handlePdfModeChange = async (mode: PdfImportMode) => {
    if (!buffer || !isPdfImport || mode === pdfImportMode) {
      return;
    }

    setFeedback(null);
    await processPdfBuffer(buffer, fileName, mode);
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!isSupportedLineTemplateImportFileName(file.name)) {
      setFeedback("Usa CSV, Excel (.xlsx, .xls) o PDF de fabricante.");
      return;
    }

    setFeedback(null);
    setFileName(file.name);
    resetPdfState();

    if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
      const text = await file.text();
      setBuffer(null);
      setSheetNames([]);
      setSelectedSheet("");
      const parsedRows = parseLineTemplateSpreadsheetUpload({ fileName: file.name, text });
      applySpreadsheetRows(parsedRows);
      return;
    }

    const nextBuffer = await file.arrayBuffer();
    setBuffer(nextBuffer);

    if (isPdfFileName(file.name)) {
      setSheetNames([]);
      setSelectedSheet("");
      await processPdfBuffer(nextBuffer, file.name);
      return;
    }

    const sheets = listXlsxSheetNames(nextBuffer);
    setSheetNames(sheets);
    const initialSheet = sheets[0] ?? "";
    setSelectedSheet(initialSheet);
    const parsedRows = parseLineTemplateSpreadsheetUpload({
      fileName: file.name,
      buffer: nextBuffer,
      sheetName: initialSheet,
    });
    applySpreadsheetRows(parsedRows);
  };

  const handleSheetChange = (sheetName: string) => {
    if (!buffer || !fileName) {
      return;
    }

    setSelectedSheet(sheetName);
    const parsedRows = parseLineTemplateSpreadsheetUpload({
      fileName,
      buffer,
      sheetName,
    });
    applySpreadsheetRows(parsedRows);
  };

  const handleMappingChange = (field: keyof LineTemplateColumnMapping, header: string) => {
    setMapping((current) => ({
      ...current,
      [field]: header || undefined,
    }));
  };

  const handleConfirmImport = async () => {
    const payloads = importableRows
      .map((row) => row.payload)
      .filter((payload): payload is NonNullable<typeof payload> => Boolean(payload));

    if (payloads.length === 0) {
      setFeedback("No hay filas validas para importar.");
      return;
    }

    try {
      const result = await importTemplates(payloads, duplicateMode);
      setImportSummary(result);
      setStep("done");
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No pudimos importar el catalogo.");
    }
  };

  const renderPreviewStatus = (row: LineTemplateImportPreviewRow) => {
    if (row.status === "ready") {
      return <span className={`${s.badge} ${s.badgeReady}`}>Lista</span>;
    }
    if (row.status === "technical") {
      return <span className={`${s.badge} ${s.badgeTechnical}`}>Tecnica</span>;
    }
    if (row.status === "price_match") {
      return <span className={`${s.badge} ${s.badgePriceMatch}`}>Precio tecnico</span>;
    }
    if (row.status === "duplicate") {
      return <span className={`${s.badge} ${s.badgeDuplicate}`}>Duplicada</span>;
    }
    return <span className={`${s.badge} ${s.badgeInvalid}`}>Invalida</span>;
  };

  const renderPdfConfidenceBadge = (confidence: PdfExtractionConfidence | "high" | "medium" | "low") => {
    const className =
      confidence === "high"
        ? s.confidenceHigh
        : confidence === "medium"
          ? s.confidenceMedium
          : s.confidenceLow;

    return (
      <span className={`${s.confidenceBadge} ${className}`}>
        Confianza {CONFIDENCE_LABELS[confidence]}
      </span>
    );
  };

  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/configuracion/empresa/lineas-precios" className={s.backButton}>
          <LuArrowLeft aria-hidden />
        </Link>
        <div className={s.headerCopy}>
          <h1>Importar catalogo</h1>
          <p>Revisa el archivo antes de guardar. Nada se persiste en silencio.</p>
        </div>
      </header>

      <ol className={s.steps}>
        {stepItems.map((item) => (
          <li
            key={item.id}
            className={`${s.step} ${step === item.id ? s.stepActive : ""} ${
              stepItems.findIndex((entry) => entry.id === step) >=
              stepItems.findIndex((entry) => entry.id === item.id)
                ? s.stepDone
                : ""
            }`}
          >
            {item.label}
          </li>
        ))}
      </ol>

      {feedback ? <div className={`${s.feedback} ${s.feedbackError}`}>{feedback}</div> : null}

      {step === "upload" ? (
        <section className={s.panel}>
          <div className={s.uploadBox}>
            <LuFileUp size={28} aria-hidden />
            <strong>Sube tu catalogo</strong>
            <p>Excel/CSV para precios, o PDF tecnico de fabricante (lineas y perfiles).</p>
            <p className={s.uploadHint}>
              Si el PDF es de Arquetipo u otro fabricante con fichas tecnicas, detectamos lineas y
              codigos de perfil. Los precios los completas despues o importas Excel aparte.
            </p>
            <label className={s.uploadButton}>
              <LuUpload aria-hidden />
              {isExtractingPdf ? "Leyendo PDF..." : "Elegir archivo"}
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.pdf"
                className={s.hiddenInput}
                disabled={isExtractingPdf}
                onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </section>
      ) : null}

      {step === "mapping" ? (
        <section className={s.panel}>
          <div className={s.panelHead}>
            <strong>Mapear columnas</strong>
            <span>{fileName}</span>
          </div>

          {isPdfImport ? (
            <div className={s.pdfPanel}>
              <div className={s.pdfPanelHead}>
                <strong>Modo de importacion PDF</strong>
                {pdfConfidence ? renderPdfConfidenceBadge(pdfConfidence) : null}
              </div>
              <div className={s.pdfModeSwitch}>
                <button
                  type="button"
                  className={`${s.modeButton} ${pdfImportMode === "commercial" ? s.modeButtonActive : ""}`}
                  onClick={() => void handlePdfModeChange("commercial")}
                >
                  Lista de precios
                </button>
                <button
                  type="button"
                  className={`${s.modeButton} ${pdfImportMode === "technical" ? s.modeButtonActive : ""}`}
                  onClick={() => void handlePdfModeChange("technical")}
                >
                  Catalogo tecnico
                </button>
              </div>
              <p className={s.pdfPanelCopy}>
                Selecciona paginas con tabla de precios. Para catalogos de fabricante usa modo
                tecnico.
              </p>

              {pdfWarnings.length > 0 ? (
                <ul className={s.warningList}>
                  {pdfWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}

              {pdfPages.length > 1 ? (
                <div className={s.pdfPageList}>
                  {pdfPages.map((page) => (
                    <label key={page.pageNumber} className={s.pdfPageOption}>
                      <input
                        type="checkbox"
                        checked={selectedPdfPages.includes(page.pageNumber)}
                        onChange={(event) =>
                          handlePdfPageToggle(page.pageNumber, event.target.checked)
                        }
                      />
                      <span>
                        Pagina {page.pageNumber}: {page.rows.length} filas detectadas
                      </span>
                      {renderPdfConfidenceBadge(page.confidence)}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {sheetNames.length > 1 ? (
            <label className={s.field}>
              <span>Hoja de Excel</span>
              <select
                value={selectedSheet}
                onChange={(event) => handleSheetChange(event.target.value)}
              >
                {sheetNames.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className={s.mappingGrid}>
            {LINE_TEMPLATE_IMPORT_FIELDS.map((field) => (
              <label key={field.key} className={s.field}>
                <span>
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(event) => handleMappingChange(field.key, event.target.value)}
                >
                  <option value="">No importar</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className={s.actions}>
            <button type="button" className={s.secondaryButton} onClick={() => setStep("upload")}>
              Volver
            </button>
            <button
              type="button"
              className={s.primaryButton}
              disabled={!mapping.nombre || rows.length === 0}
              onClick={() => {
                const summary = countImportPreviewSummary(
                  buildLineTemplateImportPreview({
                    rows,
                    mapping,
                    existingTemplates: templates,
                  })
                );
                if (summary.priceMatch > 0) {
                  setDuplicateMode("update");
                }
                setStep("preview");
              }}
            >
              Ver vista previa
            </button>
          </div>
        </section>
      ) : null}

      {step === "preview" ? (
        <section className={s.panel}>
          {isPdfImport ? (
            <div className={s.pdfPanel}>
              <div className={s.pdfPanelHead}>
                <strong>
                  {isTechnicalImport ? "Catalogo tecnico detectado" : "Importacion comercial PDF"}
                </strong>
                {pdfConfidence ? renderPdfConfidenceBadge(pdfConfidence) : null}
              </div>
              {isTechnicalImport ? (
                <p className={s.pdfPanelCopy}>
                  {technicalExtraction?.manufacturer
                    ? `Fabricante: ${technicalExtraction.manufacturer}. `
                    : ""}
                  {technicalExtraction?.lines.length ?? 0} lineas y{" "}
                  {technicalExtraction?.lines.reduce(
                    (sum, line) => sum + line.profiles.length,
                    0
                  ) ?? 0}{" "}
                  perfiles detectados. Precio comercial queda pendiente.
                </p>
              ) : (
                <p className={s.pdfPanelCopy}>
                  Revisa precios y nombres antes de confirmar. No inventamos valores faltantes.
                </p>
              )}
              <div className={s.pdfModeSwitch}>
                <button
                  type="button"
                  className={`${s.modeButton} ${!isTechnicalImport ? s.modeButtonActive : ""}`}
                  onClick={() => void handlePdfModeChange("commercial")}
                >
                  Lista de precios
                </button>
                <button
                  type="button"
                  className={`${s.modeButton} ${isTechnicalImport ? s.modeButtonActive : ""}`}
                  onClick={() => void handlePdfModeChange("technical")}
                >
                  Catalogo tecnico
                </button>
              </div>
              {pdfWarnings.length > 0 ? (
                <ul className={s.warningList}>
                  {pdfWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className={s.summaryRow}>
            {isTechnicalImport ? (
              <span>{previewSummary.technical} lineas tecnicas</span>
            ) : (
              <span>{previewSummary.ready} listas</span>
            )}
            {previewSummary.priceMatch > 0 ? (
              <span>{previewSummary.priceMatch} precio tecnico</span>
            ) : null}
            <span>{previewSummary.duplicate} duplicadas</span>
            <span>{previewSummary.invalid} invalidas</span>
          </div>

          {previewSummary.priceMatch > 0 ? (
            <p className={s.pdfPanelCopy}>
              Detectamos {previewSummary.priceMatch} fila(s) que completan precio de lineas
              tecnicas ya importadas. Se actualizan aunque elijas ignorar duplicadas.
            </p>
          ) : null}

          <fieldset className={s.duplicateMode}>
            <legend>Si el nombre ya existe</legend>
            <label>
              <input
                type="radio"
                name="duplicateMode"
                checked={duplicateMode === "skip"}
                onChange={() => setDuplicateMode("skip")}
              />
              Ignorar duplicadas
            </label>
            <label>
              <input
                type="radio"
                name="duplicateMode"
                checked={duplicateMode === "update"}
                onChange={() => setDuplicateMode("update")}
              />
              Actualizar existentes
            </label>
            <label>
              <input
                type="radio"
                name="duplicateMode"
                checked={duplicateMode === "create"}
                onChange={() => setDuplicateMode("create")}
              />
              Crear igualmente
            </label>
          </fieldset>

          <div className={s.previewTableWrap}>
            <table className={s.previewTable}>
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Estado</th>
                  <th>Nombre</th>
                  {isTechnicalImport ? <th>Tipo</th> : null}
                  {isTechnicalImport ? <th>Perfiles</th> : null}
                  <th>Precio</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{renderPreviewStatus(row)}</td>
                    <td>{row.nombre}</td>
                    {isTechnicalImport ? <td>{row.technicalTipo ?? "—"}</td> : null}
                    {isTechnicalImport ? <td>{row.technicalProfileCount ?? 0}</td> : null}
                    <td>
                      {row.payload
                        ? row.status === "technical"
                          ? "Pendiente"
                          : formatCurrency(row.payload.precioM2Sugerido)
                        : "—"}
                    </td>
                    <td>
                      {row.errors.join(" ") ||
                        (row.status === "price_match" && row.matchedTemplateNombre
                          ? `Actualiza: ${row.matchedTemplateNombre}`
                          : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={s.actions}>
            <button
              type="button"
              className={s.secondaryButton}
              onClick={() => setStep(isTechnicalImport ? "upload" : "mapping")}
            >
              Volver
            </button>
            <button
              type="button"
              className={s.primaryButton}
              disabled={isSaving || importableRows.length === 0}
              onClick={() => void handleConfirmImport()}
            >
              {isSaving ? "Importando..." : `Confirmar importacion (${importableRows.length})`}
            </button>
          </div>
        </section>
      ) : null}

      {step === "done" && importSummary ? (
        <section className={s.panel}>
          <strong>Importacion completada</strong>
          {isTechnicalImport ? (
            <p className={s.pdfPanelCopy}>
              Las lineas quedaron sin precio comercial. Completa costos en el catalogo o importa
              Excel de precios cuando lo tengas.
            </p>
          ) : null}
          <div className={s.resultGrid}>
            <span>Creadas: {importSummary.created}</span>
            <span>Actualizadas: {importSummary.updated}</span>
            <span>Ignoradas: {importSummary.skipped}</span>
            <span>Fallidas: {importSummary.failed}</span>
          </div>
          {importSummary.errors.length > 0 ? (
            <ul className={s.pdfPanelCopy}>
              {importSummary.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          <div className={s.actions}>
            <Link href="/configuracion/empresa/lineas-precios" className={s.primaryButton}>
              Volver al catalogo
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
