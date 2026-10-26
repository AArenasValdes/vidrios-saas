"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LuDownload, LuFileSpreadsheet, LuFileText } from "react-icons/lu";
import type { ReactNode } from "react";

import type { WorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import type { FabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { ManualGlassPaneMeasurementsSnapshot } from "@/features/cotizaciones/types/manual-glass-pane-measurements";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";
import { useDirectGlassDistribution } from "@/features/fabricacion/hooks/use-direct-glass-distribution";
import { GlassSheetFormatDialog } from "@/features/fabricacion/components/glass-sheet-format-dialog";
import { GlassDistributionCoverageNotice } from "./vidrios/glass-distribution-coverage-notice";
import { loadVentoraPdfLogoDataUrl } from "@/features/fabricacion/services/ventora-pdf-assets.client";

import s from "./page.module.css";

type DocumentKind = "materials" | "glass-order" | "profile-cuts";

export type WorkMaterialsDocumentPanelProps = {
  document: WorkMaterialsDocument;
  workOrder: FabricationWorkOrder;
  companyName: string;
  quoteCode: string;
  work: string;
  issueDate: string;
  view?: "all" | "actions" | "materials" | "glass-order" | "profile-cuts";
  distributionHref?: string;
  quoteId?: string;
  clientName?: string;
  items: readonly CotizacionWorkflowItem[];
  lineTemplates: readonly CotizacionLineTemplate[];
  onSaveManualGlassMeasurements: (itemId: string, value: ManualGlassPaneMeasurementsSnapshot) => Promise<void>;
};

function formatMm(value: number | null) {
  return value == null ? "Medidas pendientes" : `${Math.round(value).toLocaleString("es-CL")} mm`;
}

function formatM2(value: number | null) {
  return value == null ? "—" : `${value.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²`;
}

function Header({ title, companyName, quoteCode, work, issueDate }: Omit<WorkMaterialsDocumentPanelProps, "document" | "view"> & { title: string }) {
  return (
    <header className={s.materialDocHeader}>
      <div className={s.materialDocHeading}>
        <Image
          className={s.materialDocLogo}
          src="/brand/ventora-logo-boot.svg"
          alt="Ventora"
          width={132}
          height={42}
          unoptimized
          loading="eager"
        />
        <div>
          <p>Documento interno · trabajo</p>
          <h2>{title}</h2>
        </div>
      </div>
      <dl>
        <div><dt>Empresa</dt><dd>{companyName || "Empresa"}</dd></div>
        <div><dt>Cotización</dt><dd>{quoteCode}</dd></div>
        {work ? <div><dt>Trabajo</dt><dd>{work}</dd></div> : null}
        <div><dt>Fecha</dt><dd>{issueDate}</dd></div>
      </dl>
    </header>
  );
}

export function WorkDocumentExportActions({
  kind,
  fileBase,
  document,
  workOrder,
  companyName,
  quoteCode,
  work,
  issueDate,
  onError,
  onStatus,
}: {
  kind: DocumentKind;
  fileBase: string;
  document: WorkMaterialsDocument;
  workOrder: FabricationWorkOrder;
  companyName: string;
  quoteCode: string;
  work: string;
  issueDate: string;
  onError: (message: string | null) => void;
  onStatus?: (message: string | null) => void;
}) {
  const [isExporting, setIsExporting] = useState<"pdf" | "excel" | null>(null);
  const waitingForProfileReferences = kind === "materials" && document.profilePriceReferencesStatus === "loading";

  const exportExcel = async () => {
    setIsExporting("excel");
    onError(null);
    onStatus?.(null);
    try {
      const XLSX = await import("xlsx");
      const { buildWorkMaterialsWorkbook } = await import("@/features/fabricacion/services/work-materials-excel-export.service");
      const workbook = buildWorkMaterialsWorkbook(XLSX, {
        kind,
        document,
        workOrder,
        includeSupplierPriceReferences: false,
        companyName,
        quoteCode,
        work,
        issueDate,
      });
      const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const href = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = href;
      anchor.download = `${fileBase}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(href);
      onStatus?.("Excel generado. Revisa las descargas de tu dispositivo.");
    } catch {
      onError("No pudimos generar el Excel. Intenta nuevamente.");
    } finally {
      setIsExporting(null);
    }
  };

  const exportPdf = async () => {
    setIsExporting("pdf");
    onError(null);
    onStatus?.(null);
    try {
      const logoDataUrl = await loadVentoraPdfLogoDataUrl();
      if (!logoDataUrl) throw new Error("No se pudo cargar el logotipo corporativo. Recarga la página e inténtalo otra vez.");
      if (kind === "materials") {
        const { createWorkMaterialsPdf } = await import("@/features/fabricacion/services/work-materials-pdf-export.service");
        createWorkMaterialsPdf(document, { companyName, quoteCode, workName: work, issueDate }, logoDataUrl).save(`${fileBase}.pdf`);
      } else {
        const { createFabricationWorkOrderPdf } = await import("@/features/fabricacion/services/fabrication-work-order-pdf.service");
        createFabricationWorkOrderPdf(workOrder, { companyName, quoteCode, workName: work, issueDate }, logoDataUrl, kind).save(`${fileBase}.pdf`);
      }
      onStatus?.("PDF generado. Revisa las descargas de tu dispositivo.");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "No pudimos generar el PDF. Intenta nuevamente.");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className={`${s.materialDocActions} ${s.printHide}`} role="group" aria-label={`Descargar ${kind === "materials" ? "listado de materiales" : kind === "glass-order" ? "orden de vidrios" : "pauta de cortes de perfiles"}`}>
      <button type="button" onClick={() => void exportPdf()} disabled={isExporting !== null || waitingForProfileReferences} aria-busy={isExporting === "pdf" || waitingForProfileReferences}>
        {isExporting === "pdf" ? <LuDownload aria-hidden /> : <LuFileText aria-hidden />}
        {isExporting === "pdf" ? "Generando…" : waitingForProfileReferences ? "Consultando…" : "PDF"}
      </button>
      <button type="button" onClick={() => void exportExcel()} disabled={isExporting !== null} aria-busy={isExporting === "excel"}>
        {isExporting === "excel" ? <LuDownload aria-hidden /> : <LuFileSpreadsheet aria-hidden />}
        {isExporting === "excel" ? "Generando…" : "Excel"}
      </button>
    </div>
  );
}

export function WorkMaterialsDocumentPanel(props: WorkMaterialsDocumentPanelProps) {
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const view = props.view ?? "all";

  const glassDistribution = useDirectGlassDistribution({
    quoteId: props.quoteId ?? "",
    quoteCode: props.quoteCode,
    clientName: props.clientName ?? "",
    workName: props.work,
    onStatusChange: setExportStatus,
    onErrorChange: setExportError,
  });

  return (
    <div className={s.workDocuments}>
      {view === "all" || view === "actions" ? <section className={`${s.documentActionsSection} ${s.printHide}`} aria-label="Documentos de fabricación">
        <div><p>Resumen del trabajo</p><h2>Documentos de fabricación</h2><p>Descarga lo que necesitas para el taller.</p></div>
        <div className={s.documentActionsGrid}>
          <article><h3>Listado de materiales</h3><p>Perfiles, accesorios y superficies consolidadas.</p><WorkDocumentExportActions kind="materials" fileBase={`materiales-${sanitizeFileNamePart(props.quoteCode || "cotizacion", 32)}`} document={props.document} workOrder={props.workOrder} companyName={props.companyName} quoteCode={props.quoteCode} work={props.work} issueDate={props.issueDate} onError={setExportError} onStatus={setExportStatus} /></article>
          <article><h3>Orden de vidrios</h3><p>Lista de paños y medidas. No incluye planchas ni distribución geométrica.</p><WorkDocumentExportActions kind="glass-order" fileBase={`vidrios-${sanitizeFileNamePart(props.quoteCode || "cotizacion", 32)}`} document={props.document} workOrder={props.workOrder} companyName={props.companyName} quoteCode={props.quoteCode} work={props.work} issueDate={props.issueDate} onError={setExportError} onStatus={setExportStatus} /></article>
          <article><h3>Pauta de cortes de perfiles</h3><p>Cortes agrupados y remanente teórico según pauta guardada.</p><WorkDocumentExportActions kind="profile-cuts" fileBase={`cortes-perfiles-${sanitizeFileNamePart(props.quoteCode || "cotizacion", 32)}`} document={props.document} workOrder={props.workOrder} companyName={props.companyName} quoteCode={props.quoteCode} work={props.work} issueDate={props.issueDate} onError={setExportError} onStatus={setExportStatus} /></article>
          {props.quoteId ? (
            <article>
              <h3>Distribución de planchas de vidrio</h3>
              <p>Preparar PDF preliminar para revisar o enviar al proveedor.</p>
              <div className={s.materialDocActions}>
                <button
                  type="button"
                  onClick={glassDistribution.startDownload}
                  disabled={glassDistribution.isGenerating || glassDistribution.isCoverageLoading || glassDistribution.coverage?.status !== "complete"}
                  aria-busy={glassDistribution.isGenerating}
                  aria-label="Descargar PDF preliminar de distribución de planchas"
                >
                  {glassDistribution.isGenerating ? <LuDownload aria-hidden /> : <LuFileText aria-hidden />}
                  {glassDistribution.isGenerating ? "Generando…" : "PDF"}
                </button>
              </div>
              {props.quoteId ? (
                <GlassDistributionCoverageNotice
                  quoteId={props.quoteId}
                  coverage={glassDistribution.coverage}
                  items={props.items}
                  templates={props.lineTemplates}
                  onSaveMeasurements={props.onSaveManualGlassMeasurements}
                />
              ) : null}
            </article>
          ) : props.distributionHref ? (
            <article>
              <h3>Distribución de planchas de vidrio</h3>
              <p>Preparar PDF preliminar para revisar o enviar al proveedor.</p>
              <div className={s.materialDocActions}>
                <Link href={props.distributionHref} aria-label="Preparar PDF preliminar de distribución de planchas">
                  <LuFileText aria-hidden />PDF
                </Link>
              </div>
            </article>
          ) : null}
        </div>
        {exportError ? <p role="alert" className={s.exportNotice}>{exportError}</p> : null}
        {exportStatus ? <p role="status" className={s.documentActionStatus}>{exportStatus}</p> : null}
      </section> : null}
      {view === "all" || view === "materials" ? <section className={s.workDocument} data-work-document="materials" aria-label="Lista consolidada de materiales">
        <Header {...props} title="Lista de materiales del trabajo" />

        <MaterialTable title="Perfiles totales" empty="No hay tiras en una pauta conjunta guardada." hasRows={props.document.profiles.length > 0}>
          <table className={s.profileMaterialsTable}>
            <thead><tr><th>Código / SKU</th><th>Perfil, línea y precio</th><th>Acabado</th><th>Largo</th><th>Tiras</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
            <tbody>{props.document.profiles.map((row) => <tr key={row.key}><td>{row.code}<small>{row.price ? `${row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"}: ${row.price.sku}` : "Precio pendiente"}</small></td><td><strong>{row.description}</strong><small>{row.line}</small>{row.price ? <small>{row.price.basis} · {row.price.sourceLabel}</small> : null}</td><td>{row.finish}</td><td>{formatMm(row.commercialLengthMm)}</td><td><strong>{row.bars}</strong></td><td>{row.price ? formatMoney(row.price.unitPrice, row.price.currency) : "Pendiente"}</td><td>{row.price ? formatMoney(row.price.subtotal, row.price.currency) : "Pendiente"}</td></tr>)}</tbody>
          </table>
          <ul className={s.profileMaterialsMobile} aria-label="Perfiles y cantidades para comprar">
            {props.document.profiles.map((row) => <li key={row.key}>
              <div className={s.profileMobileHeading}><strong>{row.code}</strong><span>{row.description}</span></div>
              <dl><div><dt>Acabado</dt><dd>{row.finish}</dd></div><div><dt>Largo de tira</dt><dd>{formatMm(row.commercialLengthMm)}</dd></div><div className={s.profileMobileBars}><dt>Tiras a comprar</dt><dd>{row.bars}</dd></div></dl>
              <small>{row.line}</small>
              {row.price ? <div className={s.materialPriceDetails}><strong>{row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"}: {row.price.sku}</strong><span>{row.price.basis} · {row.price.sourceLabel}</span><span>Unitario {formatMoney(row.price.unitPrice, row.price.currency)} · subtotal {formatMoney(row.price.subtotal, row.price.currency)}</span></div> : <small>Precio pendiente</small>}
            </li>)}
          </ul>
          {!props.document.hasJointCuttingPlan ? <p className={s.documentNote}>Este histórico no conserva pauta conjunta. No se recalcularon tiras.</p> : null}
        </MaterialTable>

        <MaterialTable title="Precios unitarios de perfiles" empty={props.document.profilePriceReferencesStatus === "loading" ? "Consultando precios de perfiles…" : props.document.profilePriceReferencesStatus === "unavailable" ? "No pudimos consultar ahora los precios de perfiles." : "No hay referencias de perfiles con precio para esta línea y acabado."} hasRows={(props.document.profilePriceReferences?.length ?? 0) > 0}>
          <p className={s.documentNote}>Referencias de compra disponibles para las líneas elegidas. Muestran el precio por perfil y presentación; no calculan cortes, cantidades ni costo total de la pieza.{props.document.profilePriceReferencesCheckedAt ? ` Consulta: ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(props.document.profilePriceReferencesCheckedAt))}.` : ""}</p>
          <table className={s.profileMaterialsTable}>
            <thead><tr><th>Partida / línea</th><th>Código y perfil</th><th>Acabado</th><th>Proveedor</th><th>Presentación</th><th>Precio unitario</th><th>Estado</th></tr></thead>
            <tbody>{(props.document.profilePriceReferences ?? []).map((row) => <tr key={row.key}><td>{row.itemCode}<small>{row.line}</small></td><td><strong>{row.technicalCode}</strong><small>{row.profileName}</small>{row.supplierSku ? <small>SKU {row.supplierSku}</small> : null}</td><td>{row.finish}</td><td>{row.providerLabel}</td><td>{row.purchaseUnit || "Pendiente"}{row.commercialLengthMm ? <small>{row.commercialLengthMm.toLocaleString("es-CL")} mm</small> : null}</td><td>{row.status === "priced" && row.netPrice != null && row.currency ? formatMoney(row.netPrice, row.currency) : "Pendiente"}</td><td>{row.status === "ambiguous" ? "Presentación ambigua" : row.status === "priced" ? "Disponible" : "Sin precio"}</td></tr>)}</tbody>
          </table>
          <ul className={s.profileMaterialsMobile} aria-label="Precios unitarios de perfiles por proveedor">
            {(props.document.profilePriceReferences ?? []).map((row) => <li key={row.key}><div className={s.profileMobileHeading}><strong>{row.technicalCode}</strong><span>{row.profileName}</span></div><small>{row.itemCode} · {row.line} · {row.finish}</small><small>{row.providerLabel}{row.supplierSku ? ` · SKU ${row.supplierSku}` : ""}</small><b>{row.status === "priced" && row.netPrice != null && row.currency ? `${formatMoney(row.netPrice, row.currency)}${row.purchaseUnit ? ` por ${row.purchaseUnit}` : ""}${row.commercialLengthMm ? ` · ${row.commercialLengthMm.toLocaleString("es-CL")} mm` : ""}` : row.status === "ambiguous" ? "Presentación ambigua" : "Sin precio"}</b></li>)}
          </ul>
        </MaterialTable>

        <MaterialTable title="Accesorios" empty="Sin accesorios registrados en los snapshots." hasRows={props.document.accessories.length > 0}>
          <table className={s.accessoryMaterialsTable}>
            <thead><tr><th>Código / SKU</th><th>Descripción y precio</th><th>Cantidad</th><th>Unidad</th><th>Acabado</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
            <tbody>{props.document.accessories.map((row) => <tr key={row.key}><td>{row.code ?? "—"}<small>{row.price ? `${row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"}: ${row.price.sku}` : "Precio pendiente"}</small></td><td>{row.description}{row.price ? <small>{row.price.basis} · {row.price.sourceLabel}</small> : null}</td><td>{row.quantity}</td><td>{row.unit}</td><td>{row.finish}</td><td>{row.price ? formatMoney(row.price.unitPrice, row.price.currency) : "Pendiente"}</td><td>{row.price ? formatMoney(row.price.subtotal, row.price.currency) : "Pendiente"}</td></tr>)}</tbody>
          </table>
          <ul className={s.accessoryMaterialsMobile} aria-label="Accesorios, cantidades y precios">
            {props.document.accessories.map((row) => <li key={row.key}>
              <strong>{row.description}</strong>
              <span>{row.quantity} {row.unit} · {row.finish}</span>
              <small>{row.code ? `Código ${row.code}` : "Por especificar"}{row.price ? ` · ${row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"} ${row.price.sku}` : " · Precio pendiente"}</small>
              {row.price ? <small>{row.price.basis} · {row.price.sourceLabel}</small> : null}
              <b>{row.price ? `${formatMoney(row.price.unitPrice, row.price.currency)} c/u · ${formatMoney(row.price.subtotal, row.price.currency)} subtotal` : "Sin precio valorizado"}</b>
            </li>)}
          </ul>
        </MaterialTable>

        <MaterialTable title="Vidrios" empty="Sin medidas de vidrio en los snapshots disponibles." hasRows={props.document.glass.length > 0}>
          <table className={s.glassMaterialsTable}>
            <thead><tr><th>Código</th><th>Descripción completa</th><th>Línea</th><th>Espesor</th><th>Terminación</th><th>Composición</th><th>Superficie total</th><th>Partidas</th></tr></thead>
            <tbody>{props.document.glass.map((row) => <tr key={row.key}><td>{row.code ?? "—"}</td><td>{row.description}{row.thicknessWarning ? <small>{row.thicknessWarning}</small> : null}</td><td>{row.line}</td><td>{row.thickness || "—"}</td><td>{row.finish || "—"}</td><td>{row.composition || "—"}</td><td>{formatM2(row.totalM2)}</td><td>{row.itemCodes.join(", ")}</td></tr>)}</tbody>
          </table>
          <ul className={s.glassMaterialsMobile} aria-label="Vidrios y superficies del trabajo">
            {props.document.glass.map((row) => <li key={row.key}>
              <strong>{row.description}</strong>
              <span>{row.thickness ? `Espesor ${row.thickness}` : "Espesor pendiente"}{row.finish ? ` · ${row.finish}` : ""}</span>
              {row.thicknessWarning ? <small>{row.thicknessWarning}</small> : null}
              <small>{row.code ? `Código ${row.code}` : "Código sin identificar"} · {row.line}</small>
              <b>{formatM2(row.totalM2)} · {row.itemCodes.join(", ") || "Sin partida"}</b>
            </li>)}
          </ul>
        </MaterialTable>
      </section> : null}

{props.quoteId ? (
        <GlassSheetFormatDialog
          open={glassDistribution.formatDialogOpen}
          onOpenChange={glassDistribution.setFormatDialogOpen}
          onSubmit={glassDistribution.confirmFormat}
          isSubmitting={glassDistribution.isGenerating}
        />
      ) : null}

      {view === "all" || view === "glass-order" ? <section className={s.workDocument} data-work-document="glass-order" aria-label="Orden de vidrios">
        <Header {...props} title="Orden de vidrios" />
        <MaterialTable title="Paños por fabricar" empty="No hay vidrio ni composición registrada para ordenar." hasRows={props.document.glassOrder.length > 0}>
          <ul className={s.glassOrderMobile} aria-label="Orden de corte de vidrios">
            {props.document.glassOrder.map((row) => <li key={row.key}>
              <div className={s.glassOrderMobileLead}><strong>{row.paneReference}</strong><span>{row.quantity ?? "Cantidad pendiente"}{row.quantity == null ? "" : row.quantity === 1 ? " paño" : " paños"}</span></div>
              <strong className={s.glassOrderMobileType}>{row.description}</strong>
              <p>{row.measuresPending ? "Medidas pendientes" : `${formatMm(row.widthMm)} × ${formatMm(row.heightMm)}`}</p>
              <small>{row.thickness ? `Espesor ${row.thickness}` : "Espesor pendiente"}{row.finish ? ` · ${row.finish}` : ""}{row.composition ? ` · ${row.composition}` : ""}</small>
              {row.thicknessWarning ? <small>{row.thicknessWarning}</small> : null}
              <small>{row.componentCode} · {row.componentName}{row.code ? ` · Código vidrio ${row.code}` : ""}</small>
              <small>{formatM2(row.areaEachM2)} por paño · {formatM2(row.totalM2)} total</small>
            </li>)}
          </ul>
          <table>
            <thead><tr><th>Referencia del paño</th><th>Tipo de vidrio</th><th>Código</th><th>Ancho × alto</th><th>Cantidad</th><th>m² / paño</th><th>m² total</th></tr></thead>
            <tbody>{props.document.glassOrder.map((row, index, rows) => <Fragment key={row.key}>{index === 0 || rows[index - 1]?.groupKey !== row.groupKey ? <tr><th colSpan={7}>{row.groupLabel}</th></tr> : null}<tr><td><strong>{row.paneReference}</strong><small>{row.componentCode} · {row.componentName}</small></td><td><strong>{row.description}</strong><small>{row.thickness ? `Espesor ${row.thickness}` : "Espesor pendiente"}{row.finish ? ` · ${row.finish}` : ""}{row.composition ? ` · ${row.composition}` : ""}</small>{row.thicknessWarning ? <small>{row.thicknessWarning}</small> : null}</td><td>{row.code ?? "—"}</td><td><strong>{row.measuresPending ? "Medidas pendientes" : `${formatMm(row.widthMm)} × ${formatMm(row.heightMm)}`}</strong></td><td><strong>{row.quantity ?? "Pendiente"}</strong></td><td>{formatM2(row.areaEachM2)}</td><td>{formatM2(row.totalM2)}</td></tr></Fragment>)}</tbody>
          </table>
        </MaterialTable>
        <p className={s.documentNote}>Las medidas provienen del snapshot técnico. No se deducen desde el vano ni se asignan paños a planchas.</p>
      </section> : null}
      {view === "all" || view === "profile-cuts" ? <section className={s.workDocument} data-work-document="profile-cuts" aria-label="Pauta de cortes de perfiles">
        <Header {...props} title="Pauta de cortes de perfiles" />
        <MaterialTable title="Cortes agrupados" empty="No hay cortes guardados para este trabajo." hasRows={props.workOrder.cutGroups.length > 0}>
          <table><thead><tr><th>Código / perfil</th><th>Presentación</th><th>Cortes por componente</th><th>Remanente teórico</th></tr></thead>
            <tbody>{props.workOrder.cutGroups.map((group) => <tr key={group.key}><td><strong>{group.technicalCode}</strong><small>{group.profileName}{group.finish ? ` · ${group.finish}` : ""}</small></td><td>{group.barIndex == null ? "Distribución por tira pendiente" : `Tira ${group.barIndex} · ${formatMm(group.commercialLengthMm)}`}</td><td>{group.cuts.length ? group.cuts.map((cut) => `${cut.itemCode} · ${cut.component} · ${cut.functionName}: ${cut.quantity} × ${formatMm(cut.lengthMm)}`).join("\n") : "Sin cortes guardados"}</td><td>{formatMm(group.theoreticalRemnantMm)}</td></tr>)}</tbody>
          </table>
          <ul className={s.profileCutsMobile} aria-label="Cortes agrupados por perfil">
            {props.workOrder.cutGroups.map((group) => <li key={group.key}><strong>{group.technicalCode} · {group.profileName}</strong><span>{group.finish || "Acabado pendiente"} · {group.barIndex == null ? "Distribución por tira pendiente" : `Tira ${group.barIndex} · ${formatMm(group.commercialLengthMm)}`}</span>{group.cuts.length ? group.cuts.map((cut) => <small key={`${group.key}:${cut.itemCode}:${cut.component}:${cut.functionName}:${cut.lengthMm}`}>{cut.itemCode} · {cut.component} · {cut.functionName}: {cut.quantity} × {formatMm(cut.lengthMm)}</small>) : <small>Sin cortes guardados</small>}<b>Remanente teórico: {formatMm(group.theoreticalRemnantMm)}</b></li>)}
          </ul>
        </MaterialTable>
        {props.workOrder.pending.filter((row) => /perfil|corte|pauta|presentaci[oó]n/i.test(`${row.subject} ${row.action}`)).length ? <ul className={s.documentWarnings}>{props.workOrder.pending.filter((row) => /perfil|corte|pauta|presentaci[oó]n/i.test(`${row.subject} ${row.action}`)).map((row) => <li key={row.key}><strong>{row.subject}:</strong> {row.action}</li>)}</ul> : null}
        <p className={s.documentNote}>El remanente es teórico y no confirma aprovechamiento. Kerf y despunte se consideran solo cuando constan en la pauta guardada; no se optimizan planchas de vidrio.</p>
      </section> : null}
    </div>
  );
}

function MaterialTable({ title, empty, hasRows, children }: { title: string; empty: string; hasRows: boolean; children: ReactNode }) {
  return (
    <section className={s.materialTableSection}>
      <h3>{title}</h3>
      <div className={s.materialTableScroll}>{children}</div>
      {!hasRows ? <p className={s.documentNote}>{empty}</p> : null}
    </section>
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
