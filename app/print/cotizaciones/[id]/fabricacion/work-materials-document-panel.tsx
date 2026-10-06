"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { LuDownload, LuFileSpreadsheet } from "react-icons/lu";
import type { ReactNode } from "react";

import type { WorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";

import s from "./page.module.css";

type DocumentKind = "materials" | "glass-order";

type Props = {
  document: WorkMaterialsDocument;
  companyName: string;
  quoteCode: string;
  work: string;
  issueDate: string;
};

function formatMm(value: number | null) {
  return value == null ? "Medidas pendientes" : `${Math.round(value).toLocaleString("es-CL")} mm`;
}

function formatM2(value: number | null) {
  return value == null ? "—" : `${value.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²`;
}

function Header({ title, companyName, quoteCode, work, issueDate }: Omit<Props, "document"> & { title: string }) {
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

function ExportActions({
  kind,
  fileBase,
  document,
  companyName,
  quoteCode,
  work,
  issueDate,
  onError,
}: {
  kind: DocumentKind;
  fileBase: string;
  document: WorkMaterialsDocument;
  companyName: string;
  quoteCode: string;
  work: string;
  issueDate: string;
  onError: (message: string | null) => void;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const exportExcel = async () => {
    setIsExporting(true);
    onError(null);
    try {
      const XLSX = await import("xlsx");
      const { buildWorkMaterialsWorkbook } = await import("@/features/fabricacion/services/work-materials-excel-export.service");
      const workbook = buildWorkMaterialsWorkbook(XLSX, {
        kind,
        document,
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
    } catch {
      onError("No pudimos generar el Excel. Intenta nuevamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`${s.materialDocActions} ${s.printHide}`}>
      <button type="button" onClick={() => void exportExcel()} disabled={isExporting}>
        {isExporting ? <LuDownload aria-hidden /> : <LuFileSpreadsheet aria-hidden />}
        {isExporting ? "Generando…" : "Excel"}
      </button>
    </div>
  );
}

export function WorkMaterialsDocumentPanel(props: Props) {
  const [exportError, setExportError] = useState<string | null>(null);
  const fileBase = `materiales-${sanitizeFileNamePart(props.quoteCode || "cotizacion", 32)}`;

  return (
    <div className={s.workDocuments}>
      <section className={s.workDocument} data-work-document="materials" aria-label="Lista consolidada de materiales">
        <Header {...props} title="Lista de materiales del trabajo" />
        <ExportActions kind="materials" fileBase={fileBase} document={props.document} companyName={props.companyName} quoteCode={props.quoteCode} work={props.work} issueDate={props.issueDate} onError={setExportError} />
        {exportError ? <p role="alert" className={s.exportNotice}>{exportError}</p> : null}

        <MaterialTable title="Perfiles totales" empty="No hay barras en una pauta conjunta guardada." hasRows={props.document.profiles.length > 0}>
          <table className={s.profileMaterialsTable}>
            <thead><tr><th>Código / SKU</th><th>Perfil, línea y precio</th><th>Acabado</th><th>Largo</th><th>Barras</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
            <tbody>{props.document.profiles.map((row) => <tr key={row.key}><td>{row.code}<small>{row.price ? `${row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"}: ${row.price.sku}` : "Precio pendiente"}</small></td><td><strong>{row.description}</strong><small>{row.line}</small>{row.price ? <small>{row.price.basis}{row.price.isWorkshopCode ? ` · ${row.price.sourceLabel}` : " · Precio referencial"}</small> : null}</td><td>{row.finish}</td><td>{formatMm(row.commercialLengthMm)}</td><td><strong>{row.bars}</strong></td><td>{row.price ? formatMoney(row.price.unitPrice, row.price.currency) : "Pendiente"}</td><td>{row.price ? formatMoney(row.price.subtotal, row.price.currency) : "Pendiente"}</td></tr>)}</tbody>
          </table>
          <ul className={s.profileMaterialsMobile} aria-label="Perfiles y cantidades para comprar">
            {props.document.profiles.map((row) => <li key={row.key}>
              <div className={s.profileMobileHeading}><strong>{row.code}</strong><span>{row.description}</span></div>
              <dl><div><dt>Acabado</dt><dd>{row.finish}</dd></div><div><dt>Largo de barra</dt><dd>{formatMm(row.commercialLengthMm)}</dd></div><div className={s.profileMobileBars}><dt>Barras a comprar</dt><dd>{row.bars}</dd></div></dl>
              <small>{row.line}</small>
              {row.price ? <div className={s.materialPriceDetails}><strong>{row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"}: {row.price.sku}</strong><span>{row.price.basis}{row.price.isWorkshopCode ? ` · ${row.price.sourceLabel}` : " · Precio referencial"}</span><span>Unitario {formatMoney(row.price.unitPrice, row.price.currency)} · subtotal {formatMoney(row.price.subtotal, row.price.currency)}</span></div> : <small>Precio pendiente</small>}
            </li>)}
          </ul>
          {!props.document.hasJointCuttingPlan ? <p className={s.documentNote}>Este histórico no conserva pauta conjunta. No se recalcularon barras.</p> : null}
        </MaterialTable>

        <MaterialTable title="Accesorios" empty="Sin accesorios registrados en los snapshots." hasRows={props.document.accessories.length > 0}>
          <table className={s.accessoryMaterialsTable}>
            <thead><tr><th>Código / SKU</th><th>Descripción y precio</th><th>Cantidad</th><th>Unidad</th><th>Acabado</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
            <tbody>{props.document.accessories.map((row) => <tr key={row.key}><td>{row.code ?? "—"}<small>{row.price ? `${row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"}: ${row.price.sku}` : "Precio pendiente"}</small></td><td>{row.description}{row.price ? <small>{row.price.basis}{row.price.isWorkshopCode ? ` · ${row.price.sourceLabel}` : " · Precio referencial"}</small> : null}</td><td>{row.quantity}</td><td>{row.unit}</td><td>{row.finish}</td><td>{row.price ? formatMoney(row.price.unitPrice, row.price.currency) : "Pendiente"}</td><td>{row.price ? formatMoney(row.price.subtotal, row.price.currency) : "Pendiente"}</td></tr>)}</tbody>
          </table>
          <ul className={s.accessoryMaterialsMobile} aria-label="Accesorios, cantidades y precios">
            {props.document.accessories.map((row) => <li key={row.key}>
              <strong>{row.description}</strong>
              <span>{row.quantity} {row.unit} · {row.finish}</span>
              <small>{row.code ? `Código ${row.code}` : "Por especificar"}{row.price ? ` · ${row.price.isWorkshopCode ? "Código del taller" : "SKU proveedor"} ${row.price.sku}` : " · Precio pendiente"}</small>
              {row.price ? <small>{row.price.basis}{row.price.isWorkshopCode ? ` · ${row.price.sourceLabel}` : " · Precio referencial"}</small> : null}
              <b>{row.price ? `${formatMoney(row.price.unitPrice, row.price.currency)} c/u · ${formatMoney(row.price.subtotal, row.price.currency)} subtotal` : "Sin precio valorizado"}</b>
            </li>)}
          </ul>
        </MaterialTable>

        <MaterialTable title="Vidrios" empty="Sin medidas de vidrio en los snapshots disponibles." hasRows={props.document.glass.length > 0}>
          <table className={s.glassMaterialsTable}>
            <thead><tr><th>Código</th><th>Descripción completa</th><th>Línea</th><th>Espesor</th><th>Terminación</th><th>Composición</th><th>Superficie total</th><th>Partidas</th></tr></thead>
            <tbody>{props.document.glass.map((row) => <tr key={row.key}><td>{row.code ?? "—"}</td><td>{row.description}</td><td>{row.line}</td><td>{row.thickness || "—"}</td><td>{row.finish || "—"}</td><td>{row.composition || "—"}</td><td>{formatM2(row.totalM2)}</td><td>{row.itemCodes.join(", ")}</td></tr>)}</tbody>
          </table>
          <ul className={s.glassMaterialsMobile} aria-label="Vidrios y superficies del trabajo">
            {props.document.glass.map((row) => <li key={row.key}>
              <strong>{row.description}</strong>
              <span>{row.thickness ? `Espesor ${row.thickness}` : "Espesor pendiente"}{row.finish ? ` · ${row.finish}` : ""}</span>
              <small>{row.code ? `Código ${row.code}` : "Código sin identificar"} · {row.line}</small>
              <b>{formatM2(row.totalM2)} · {row.itemCodes.join(", ") || "Sin partida"}</b>
            </li>)}
          </ul>
        </MaterialTable>
      </section>

      <section className={s.workDocument} data-work-document="glass-order" aria-label="Orden de vidrios">
        <Header {...props} title="Orden de vidrios" />
        <ExportActions kind="glass-order" fileBase={`vidrios-${sanitizeFileNamePart(props.quoteCode || "cotizacion", 32)}`} document={props.document} companyName={props.companyName} quoteCode={props.quoteCode} work={props.work} issueDate={props.issueDate} onError={setExportError} />
        <MaterialTable title="Paños por fabricar" empty="No hay vidrio ni composición registrada para ordenar." hasRows={props.document.glassOrder.length > 0}>
          <ul className={s.glassOrderMobile} aria-label="Orden de corte de vidrios">
            {props.document.glassOrder.map((row) => <li key={row.key}>
              <div className={s.glassOrderMobileLead}><strong>{row.paneReference}</strong><span>{row.quantity ?? "Cantidad pendiente"}{row.quantity == null ? "" : row.quantity === 1 ? " paño" : " paños"}</span></div>
              <strong className={s.glassOrderMobileType}>{row.description}</strong>
              <p>{row.measuresPending ? "Medidas pendientes" : `${formatMm(row.widthMm)} × ${formatMm(row.heightMm)}`}</p>
              <small>{row.thickness ? `Espesor ${row.thickness}` : "Espesor pendiente"}{row.finish ? ` · ${row.finish}` : ""}{row.composition ? ` · ${row.composition}` : ""}</small>
              <small>{row.componentCode} · {row.componentName}{row.code ? ` · Código vidrio ${row.code}` : ""}</small>
              <small>{formatM2(row.areaEachM2)} por paño · {formatM2(row.totalM2)} total</small>
            </li>)}
          </ul>
          <table>
            <thead><tr><th>Referencia del paño</th><th>Tipo de vidrio</th><th>Código</th><th>Ancho × alto</th><th>Cantidad</th><th>m² / paño</th><th>m² total</th></tr></thead>
            <tbody>{props.document.glassOrder.map((row, index, rows) => <Fragment key={row.key}>{index === 0 || rows[index - 1]?.groupKey !== row.groupKey ? <tr><th colSpan={7}>{row.groupLabel}</th></tr> : null}<tr><td><strong>{row.paneReference}</strong><small>{row.componentCode} · {row.componentName}</small></td><td><strong>{row.description}</strong><small>{row.thickness ? `Espesor ${row.thickness}` : "Espesor pendiente"}{row.finish ? ` · ${row.finish}` : ""}{row.composition ? ` · ${row.composition}` : ""}</small></td><td>{row.code ?? "—"}</td><td><strong>{row.measuresPending ? "Medidas pendientes" : `${formatMm(row.widthMm)} × ${formatMm(row.heightMm)}`}</strong></td><td><strong>{row.quantity ?? "Pendiente"}</strong></td><td>{formatM2(row.areaEachM2)}</td><td>{formatM2(row.totalM2)}</td></tr></Fragment>)}</tbody>
          </table>
        </MaterialTable>
        <p className={s.documentNote}>Las medidas provienen del snapshot técnico. No se deducen desde el vano ni se asignan paños a planchas.</p>
      </section>
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
