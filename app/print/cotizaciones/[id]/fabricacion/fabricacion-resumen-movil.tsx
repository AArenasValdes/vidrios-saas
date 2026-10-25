"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  LuArrowLeft,
  LuChevronRight,
  LuDownload,
  LuFileText,
  LuPrinter,
} from "react-icons/lu";

import { ComponentPreview } from "@/features/cotizaciones/components/component-preview";
import { buildConsolidatedCubicationPautaFromSnapshots } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import {
  formatFabricationItemLineCaption,
  type FabricationQuoteSummary,
  type FabricationSummaryItem,
} from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import {
  FABRICATION_TYPE_LABELS,
  herrajeDisplayLabel,
  type FabricationType,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import {
  resolveCutProfileCode,
  resolveCutProfileDisplayCode,
  resolveCutProfileName,
} from "@/features/cotizaciones/line-templates/services/cut-profile-display.service";
import { buildComponentPreviewInputFromWorkflowItem } from "@/features/cotizaciones/services/resolve-component-preview-svg";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  formatSodalL25GlazingLabel,
  formatSodalL25LegLabel,
  formatSodalL25ReinforcementLabel,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { WorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import type { FabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";
import { WorkMaterialsDocumentPanel } from "./work-materials-document-panel";
import { CompactMaterialsView, CompactCutsView, CompactGlassView } from "./fabricacion-movil-compact-views";
import { GlassDistributionPanel } from "./vidrios/glass-distribution-panel";
import { useDirectGlassDistribution } from "@/features/fabricacion/hooks/use-direct-glass-distribution";
import { GlassSheetFormatDialog } from "@/features/fabricacion/components/glass-sheet-format-dialog";
import { GlassDistributionCoverageNotice } from "./vidrios/glass-distribution-coverage-notice";

import {
  buildCubicacionPerfilRows,
  formatM2,
  formatMl,
  formatMm,
  formatPautaBarLine,
  formatPautaProfileHeading,
  formatTirasNecesariasLabel,
  groupBarsByProfile,
  isUnassignedProfileLabel,
} from "./fabricacion-resumen-view";
import s from "./page.module.css";

type HomeTab = "resumen" | "materiales" | "vidrios" | "cortes" | "costos";
type DetailTab = "resumen" | "cortes" | "despiece";

type Props = {
  backHref: string;
  pdfHref: string;
  quoteId: string;
  codigo: string;
  clienteNombre: string;
  obra: string;
  summary: FabricationQuoteSummary;
  items: CotizacionWorkflowItem[];
  isExporting: boolean;
  exportError: string | null;
  materialsDocument: WorkMaterialsDocument;
  workOrder: FabricationWorkOrder;
  companyName: string;
  issueDate: string;
  technicalCostPanel?: ReactNode;
  onDownload: () => void;
  onPrint: () => void;
  onOpenDespiece: (itemId: string) => void;
};

function formatVariantLabel(value: string | null | undefined) {
  if (!value) return "";
  if (value === "estandar") return "Estándar";
  if (value === "reforzada") return "Reforzada";
  if (value === "termopanel") return "Termopanel";
  return value;
}

function stripCodePrefix(label: string, code: string) {
  const trimmed = code.trim();
  if (!trimmed) return label;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return label.replace(new RegExp(`^${escaped}\\s*[-–]?\\s*`, "i"), "").trim() || label;
}

function formatMobileProfileHeading(code: string, label: string) {
  const heading = formatPautaProfileHeading(code, label);
  const trimmedCode = code.trim();
  if (!trimmedCode || isUnassignedProfileLabel(trimmedCode)) {
    return heading;
  }
  const escaped = trimmedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const duplicated = new RegExp(
    `^${escaped}\\s*·\\s*${escaped}\\s*[-–]?\\s*`,
    "i"
  );
  if (duplicated.test(heading)) {
    return heading.replace(duplicated, `${trimmedCode} · `);
  }
  return heading;
}

function SegmentedControl<T extends string>({
  value,
  options,
  ariaLabel,
  id,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  ariaLabel: string;
  id: string;
  onChange: (value: T) => void;
}) {
  const activeIndex = options.findIndex((option) => option.id === value);
  return (
    <div className={s.mSegmented} role="tablist" aria-label={ariaLabel} onKeyDown={(event) => {
      const nextIndex = event.key === "ArrowRight" ? (activeIndex + 1) % options.length
        : event.key === "ArrowLeft" ? (activeIndex - 1 + options.length) % options.length
          : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      const next = options[nextIndex];
      onChange(next.id);
      document.getElementById(`${id}-${next.id}`)?.focus();
    }}>
      {options.map((option) => (
        <button
          key={option.id}
          id={`${id}-${option.id}`}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          aria-controls={`${id}-panel`}
          tabIndex={value === option.id ? 0 : -1}
          className={value === option.id ? s.mSegmentedActive : s.mSegmentedButton}
          onClick={(event) => {
            onChange(option.id);
            event.currentTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" });
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.mMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryMetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.mSummaryMetric}>
      <span className={s.mSummaryMetricLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className={s.mTechRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ComponentCard({
  row,
  onOpen,
  onOpenDespiece,
}: {
  row: FabricationSummaryItem;
  onOpen: () => void;
  onOpenDespiece: () => void;
}) {
  const lineCaption = formatFabricationItemLineCaption(row.lineName, row.material);
  const unitLabel = row.quantity === 1 ? "unidad" : "unidades";

  return (
    <details className={s.mPieceCard}>
      <summary>
        <span className={s.mPieceCode}>{row.codigo}</span>
        <span className={s.mPieceCardBody}>
          <strong className={s.mPieceTitle}>{row.nombre}</strong>
          <span className={s.mPieceMeta}>{row.widthMm.toLocaleString("es-CL")} × {row.heightMm.toLocaleString("es-CL")} mm · {row.quantity} {unitLabel}</span>
        </span>
        <LuChevronRight aria-hidden className={s.mChevron} />
      </summary>
      <div className={s.mPieceExpanded}>
        <p className={s.mPieceLine}>{lineCaption} · {row.statusLabel}</p>
        <div className={s.mPieceMetrics}>
          <MetricCell label="Perfiles" value={formatMl(row.profilesMl)} />
          <MetricCell label="Vidrio" value={formatM2(row.glassM2)} />
          <MetricCell label="Tiras" value={formatTirasNecesariasLabel(row.barCount, row.snapshot.bars)} />
        </div>
        <div className={s.mPieceActions}>
          <button type="button" onClick={onOpen}>Ver detalle</button>
          <button type="button" onClick={onOpenDespiece}>Revisar despiece</button>
        </div>
      </div>
    </details>
  );
}

function DetailResumen({
  row,
  sourceItem,
}: {
  row: FabricationSummaryItem;
  sourceItem: CotizacionWorkflowItem | null;
}) {
  const previewInput = sourceItem
    ? buildComponentPreviewInputFromWorkflowItem(sourceItem, { maxW: 280, maxH: 180 })
    : null;
  const presentation = sourceItem
    ? decodeCotizacionItemPresentationMeta(sourceItem.observaciones)
    : null;
  const recipe = row.recipe;
  const profileRows = buildCubicacionPerfilRows(row.snapshot);
  const accessories = recipe?.components.filter((component) => component.kind === "accessory") ?? [];
  const glass = row.snapshot.glass;
  const typeLabel = recipe
    ? FABRICATION_TYPE_LABELS[recipe.fabricationType as FabricationType] || recipe.fabricationType
    : "";
  const herraje = recipe
    ? herrajeDisplayLabel(recipe.herrajeTipo, recipe.herrajeLabel)
    : row.herrajeLabel;
  const glassName = sourceItem?.vidrio?.trim() || "";

  return (
    <div className={s.mStack}>
      <section className={s.mGroup} aria-label="Dibujo">
        <div className={s.mDrawing}>
          {previewInput ? (
            <ComponentPreview {...previewInput} size="hero" />
          ) : (
            <p>Sin croquis</p>
          )}
        </div>
      </section>

      <section className={s.mGroup} aria-label="Perfiles">
        <h3>Perfiles</h3>
        <p className={s.mGroupLead}>{formatMl(row.profilesMl)}</p>
        <ul className={s.mPlainList}>
          {profileRows.map((profileRow) => (
            <li key={`${row.itemId}-${profileRow.identityKey}`}>
              <strong>{formatMobileProfileHeading(profileRow.code, profileRow.label)}</strong>
              <span>{formatMm(profileRow.materialNeededMm)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.mGroup} aria-label="Vidrio">
        <h3>Vidrio</h3>
        <p className={s.mGroupLead}>{formatM2(row.glassM2)}</p>
        <p className={s.mGroupNote}>Espesor técnico: {row.glassThickness}</p>
        {row.glassThicknessWarning ? <p className={s.mGroupNote}>{row.glassThicknessWarning}</p> : null}
        {glass ? (
          <p className={s.mGroupNote}>
            {formatMm(glass.widthMm)} × {formatMm(glass.heightMm)}
            {glass.quantity > 1 ? ` · ${glass.quantity} u` : ""}
            {glassName ? ` · ${glassName}` : ""}
          </p>
        ) : (
          <p className={s.mGroupNote}>Sin vidrio en esta pauta</p>
        )}
      </section>

      <section className={s.mGroup} aria-label="Tiras">
        <h3>Tiras</h3>
        <p className={s.mGroupLead}>
          {formatTirasNecesariasLabel(row.barCount, row.snapshot.bars)}
        </p>
      </section>

      <section className={s.mGroup} aria-label="Accesorios">
        <h3>Accesorios</h3>
        <p className={s.mGroupLead}>{row.accessoryUnits} unidades</p>
        {accessories.length > 0 ? (
          <ul className={s.mPlainList}>
            {accessories.map((accessory) => (
              <li key={accessory.id}>
                <strong>{accessory.functionLabel || accessory.profileName || "Accesorio"}</strong>
                <span>{accessory.quantityValue}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={s.mGroup} aria-label="Configuración técnica">
        <h3>Configuración técnica</h3>
        <div className={s.mTechList}>
          <TechRow label="Tipo" value={typeLabel} />
          <TechRow
            label="Hojas"
            value={recipe?.sashCount ? String(recipe.sashCount) : ""}
          />
          <TechRow label="Herraje" value={herraje && herraje !== "-" ? herraje : ""} />
          <TechRow label="Variante" value={formatVariantLabel(recipe?.variant)} />
          <TechRow
            label="Vidrio"
            value={formatSodalL25GlazingLabel(presentation?.fabricacionGlazing) || glassName}
          />
          <TechRow
            label="Pierna"
            value={formatSodalL25LegLabel(presentation?.fabricacionLeg)}
          />
          <TechRow
            label="Refuerzo"
            value={formatSodalL25ReinforcementLabel(presentation?.fabricacionReinforcement)}
          />
        </div>
      </section>
    </div>
  );
}

function DetailCortes({ row }: { row: FabricationSummaryItem }) {
  if (row.snapshot.bars.length === 0) {
    return <p className={s.mEmpty}>Esta pieza aún no tiene pauta de tiras.</p>;
  }

  const groups = groupBarsByProfile(row.snapshot.bars);

  return (
    <div className={s.mStack}>
      {groups.map((group) => (
        <section key={group.key} className={s.mGroup} aria-label={group.label}>
          <h3>{formatMobileProfileHeading(group.code, group.label)}</h3>
          <ul className={s.mCutList}>
            {group.bars.map((bar) => {
              const cutCount = bar.cuts.reduce(
                (sum, cut) => sum + (cut.quantity > 0 ? cut.quantity : 1),
                0
              );
              return (
                <li key={`${row.itemId}-bar-${bar.index}`}>
                  {formatPautaBarLine(bar, cutCount)}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DetailDespiece({ row }: { row: FabricationSummaryItem }) {
  if (row.snapshot.cuts.length === 0) {
    return <p className={s.mEmpty}>Esta pieza aún no tiene despiece.</p>;
  }

  return (
    <section className={s.mGroup} aria-label="Despiece">
      <ul className={s.mDespieceList}>
        {row.snapshot.cuts.map((cut, index) => {
          const code = resolveCutProfileDisplayCode(cut);
          const missing = !resolveCutProfileCode(cut);
          return (
            <li key={`${row.itemId}-cut-${index}`}>
              <strong className={missing ? s.mMuted : undefined}>{code}</strong>
              <span>{stripCodePrefix(resolveCutProfileName(cut), code)}</span>
              <em>
                {cut.quantity} × {formatMm(cut.lengthMm)}
              </em>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ConsolidadoView({
  summary,
}: {
  summary: FabricationQuoteSummary;
}) {
  const consolidated = useMemo(
    () =>
      buildConsolidatedCubicationPautaFromSnapshots(
        summary.items.map((row) => ({
          codigo: row.codigo,
          lineaComercial: row.lineName,
          nombre: row.nombre,
          snapshot: row.snapshot,
        })),
        summary.trabajoSnapshot,
        { deriveTrabajoSnapshot: false }
      ),
    [summary.items, summary.trabajoSnapshot]
  );

  return (
    <div className={s.mStack}>
      <details className={s.secondaryWorkshopDetails}>
        <summary>Ver pauta, cortes y sobrantes</summary>
        {consolidated.lineGroups.length === 0 ? (
          <p className={s.mEmpty}>Todavía no hay despiece consolidable. Revisa piezas con línea, medidas y cortes.</p>
        ) : (
          <>
      <section className={s.mGroup} aria-label="Qué fabricar">
        <h3>Qué necesito fabricar</h3>
        <div className={s.mNeedGrid}>
          <MetricCell label="Largo usado en cortes" value={formatMl(summary.totalProfilesMl)} />
          <MetricCell label="Tiras" value={summary.trabajoSnapshot ? String(summary.trabajoSnapshot.totalBars) : "—"} />
          <MetricCell label="Largos disponibles según pauta" value={formatMm(consolidated.totalWasteMm)} />
          <MetricCell label="Vidrio" value={formatM2(consolidated.totalGlassM2)} />
        </div>
      </section>

      {summary.trabajoSnapshot ? (
        <section className={s.mGroup} aria-label="Tiras compartidas del trabajo">
          <h3>Pauta conjunta · trabajo completo</h3>
          <p className={s.mGroupNote}>{summary.trabajoSnapshot.totalBars} tiras compartidas entre partidas.</p>
          {summary.trabajoSnapshot.missingPresentations?.map((missing, index) => (
            <p className={s.mGroupNote} key={`${missing.itemId}-${missing.technicalCode}-${missing.finishKey}-${index}`}>
              Presentación pendiente · {missing.technicalCode}: {missing.reason}
            </p>
          ))}
          <ul className={s.mDespieceList}>
            {summary.trabajoSnapshot.bars.map((bar) => (
              <li key={`${bar.materialKey}-${bar.acabadoKey}-${bar.largoComercialMm}-${bar.indice}`}>
                <strong>{bar.supplierSku ? `${bar.supplierSku} · ${bar.codigoPerfil}` : bar.codigoPerfil} · Tira #{bar.indice} · {formatMm(bar.largoComercialMm)}</strong>
                <span>Largo usado en cortes {formatMm(bar.usadoMm)} · Largo disponible según pauta {formatMm(bar.sobranteMm)}</span>
                {bar.cortes.map((cut, index) => (
                  <em className={s.mBarTrace} key={`${cut.itemId}-${cut.componenteId}-${index}`}>
                    {cut.codigoItem} · {cut.funcion} · {formatMm(cut.largoMm)}
                  </em>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className={s.mGroup} aria-label="Pauta conjunta no guardada">
          <h3>Pauta conjunta no disponible</h3>
          <p className={s.mGroupNote}>Esta cotización no conserva una distribución compartida. El histórico no se recalcula; revisa los cortes por componente.</p>
        </section>
      )}

      {consolidated.lineGroups.map((group) => (
        <section
          key={group.lineTemplateId || group.lineName}
          className={s.mGroup}
          aria-label={group.lineName}
        >
          <h3>{group.lineName} · cortes por componente</h3>
          <p className={s.mGroupNote}>
            {formatMl(group.totalLinealMm / 1000)} en total
            {group.accessories > 0 ? ` · ${group.accessories} accesorios` : ""}
          </p>
          <ul className={s.mDespieceList}>
            {group.rows.map((cutRow) => (
              <li key={cutRow.key}>
                <strong>{cutRow.profile}</strong>
                <span>{stripCodePrefix(cutRow.functionLabel, cutRow.profile)}</span>
                <em>
                  {cutRow.quantity} × {formatMm(cutRow.lengthMm)}
                </em>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {consolidated.glassRows.length > 0 ? (
        <section className={s.mGroup} aria-label="Vidrio consolidado">
          <h3>Vidrio</h3>
          <ul className={s.mDespieceList}>
            {consolidated.glassRows.map((glassRow) => (
              <li key={glassRow.key}>
                <strong>
                  {formatMm(glassRow.widthMm)} × {formatMm(glassRow.heightMm)}
                </strong>
                <span>{glassRow.pieceCodes.join(", ")}</span>
                <em>
                  {glassRow.quantity} u · {formatM2(glassRow.totalM2)}
                </em>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {consolidated.totalAccessories > 0 ? (
        <section className={s.mGroup} aria-label="Accesorios consolidados">
          <h3>Accesorios</h3>
          <p className={s.mGroupLead}>{consolidated.totalAccessories} unidades</p>
        </section>
      ) : null}
          </>
        )}
      </details>
    </div>
  );
}

export function FabricacionResumenMovil({
  backHref,
  pdfHref,
  quoteId,
  codigo,
  clienteNombre,
  obra,
  summary,
  items,
  isExporting,
  exportError,
  materialsDocument,
  workOrder,
  companyName,
  issueDate,
  technicalCostPanel,
  onDownload,
  onPrint,
  onOpenDespiece,
}: Props) {
  const [homeTab, setHomeTab] = useState<HomeTab>("resumen");
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("resumen");

  const glassDistribution = useDirectGlassDistribution({
    quoteId,
    quoteCode: codigo,
    clientName: clienteNombre,
    workName: obra,
  });

  const detailRow = summary.items.find((row) => row.itemId === detailItemId) ?? null;
  const detailSource = detailRow
    ? items.find((item) => item.id === detailRow.itemId) ?? null
    : null;

  return (
    <div className={s.mShell} data-testid="fabricacion-mobile">
      <header className={s.mHeader}>
        {detailRow ? (
          <button
            type="button"
            className={s.mBack}
            onClick={() => {
              setDetailItemId(null);
              setDetailTab("resumen");
            }}
          >
            <LuArrowLeft aria-hidden />
            Resumen
          </button>
        ) : (
          <Link href={backHref} className={s.mBack}>
            <LuArrowLeft aria-hidden />
            Volver
          </Link>
        )}
        <div className={s.mHeaderCopy}>
          <h1>{detailRow ? `${detailRow.codigo} · ${detailRow.nombre}` : "Resumen de fabricación"}</h1>
          <p>
            {codigo}
            <span aria-hidden> · </span>
            {clienteNombre || "Sin cliente"}
            {obra ? (
              <>
                <span aria-hidden> · </span>
                {obra}
              </>
            ) : null}
          </p>
        </div>
      </header>

      {!detailRow ? (
        <div className={s.mSegmentWrap}>
            <SegmentedControl
              value={homeTab}
              ariaLabel="Secciones de fabricación"
              id="fabricacion-tabs"
              options={[
                { id: "resumen", label: "Resumen" },
                { id: "materiales", label: "Materiales" },
                { id: "vidrios", label: "Vidrios" },
                { id: "cortes", label: "Cortes" },
                { id: "costos", label: "Costos" },
              ]}
              onChange={setHomeTab}
            />
        </div>
      ) : (
        <div className={s.mSegmentWrap}>
          <SegmentedControl
            value={detailTab}
            ariaLabel="Detalle del componente"
            id="fabricacion-detail-tabs"
            options={[
              { id: "resumen", label: "Resumen" },
              { id: "cortes", label: "Cortes" },
              { id: "despiece", label: "Despiece" },
            ]}
            onChange={setDetailTab}
          />
        </div>
      )}

      {exportError ? <p className={s.mExportNotice} role="alert">{exportError}</p> : null}

      <div
        id={detailRow ? "fabricacion-detail-tabs-panel" : "fabricacion-tabs-panel"}
        role="tabpanel"
        aria-labelledby={detailRow ? `fabricacion-detail-tabs-${detailTab}` : `fabricacion-tabs-${homeTab}`}
        className={s.mContent}
      >
        {!detailRow ? (
          <div hidden={homeTab !== "vidrios"}>
            <GlassDistributionPanel
              quoteId={quoteId}
              quoteCode={codigo}
              clientName={clienteNombre}
              workName={obra}
              enabled
              autoPreview={homeTab === "vidrios"}
              preloadPreview
            />
          </div>
        ) : null}
        {detailRow ? (
          detailTab === "resumen" ? (
            <DetailResumen row={detailRow} sourceItem={detailSource} />
          ) : detailTab === "cortes" ? (
            <DetailCortes row={detailRow} />
          ) : (
            <DetailDespiece row={detailRow} />
          )
        ) : homeTab === "materiales" ? (
          <CompactMaterialsView
            document={materialsDocument}
            workOrder={workOrder}
            companyName={companyName}
            quoteCode={codigo}
            work={obra}
            issueDate={issueDate}
          />
        ) : homeTab === "vidrios" ? (
          <CompactGlassView
            quoteId={quoteId}
            quoteCode={codigo}
            clienteNombre={clienteNombre}
            obra={obra}
            document={materialsDocument}
            workOrder={workOrder}
            companyName={companyName}
            issueDate={issueDate}
          />
        ) : homeTab === "cortes" ? (
          <CompactCutsView
            summary={summary}
            workOrder={workOrder}
            materialsDocument={materialsDocument}
            companyName={companyName}
            quoteCode={codigo}
            work={obra}
            issueDate={issueDate}
          />
        ) : homeTab === "costos" ? (
          <section className={s.mCostTab} aria-label="Costos de fabricación">
            {technicalCostPanel}
            {!technicalCostPanel ? <p className={s.mEmpty}>Los costos de fabricación no están habilitados para esta cotización.</p> : null}
          </section>
        ) : (
          <section className={s.mSummarySections} aria-label="Resumen y documentos">
            <div className={s.mSummarySurface}>
              <section className={s.mSummarySection}>
                <h2>Documentos de fabricación</h2>
                <div className={s.mDocumentRows}>
                  <WorkMaterialsDocumentPanel document={materialsDocument} workOrder={workOrder} companyName={companyName} quoteCode={codigo} work={obra} issueDate={issueDate} view="actions" />
                  <div className={s.mDocumentRow}>
                    <span className={s.mDocumentCopy}>
                      <strong>Distribución de planchas de vidrio</strong>
                      <small>PDF preliminar</small>
                    </span>
                    <button
                      type="button"
                      className={s.mDocumentAction}
                      onClick={glassDistribution.startDownload}
                      disabled={glassDistribution.isGenerating || glassDistribution.isCoverageLoading || glassDistribution.coverage?.status !== "complete"}
                      aria-label="Descargar PDF preliminar de distribución de planchas"
                      aria-busy={glassDistribution.isGenerating}
                    >
                      {glassDistribution.isGenerating ? "Generando…" : "PDF"}
                    </button>
                  </div>
                  <GlassDistributionCoverageNotice quoteId={quoteId} coverage={glassDistribution.coverage} />
                  {glassDistribution.error ? (
                    <p role="alert" className={s.exportNotice}>
                      {glassDistribution.error}
                    </p>
                  ) : null}
                  {glassDistribution.notice ? (
                    <p role="status" className={s.documentActionStatus}>
                      {glassDistribution.notice}
                    </p>
                  ) : null}
                </div>
                <div className={s.mSecondaryDocs}>
                  <button type="button" onClick={onDownload} disabled={isExporting}><LuDownload aria-hidden />{isExporting ? "Generando…" : "PDF conjunto"}</button>
                  <Link href={pdfHref}><LuFileText aria-hidden />PDF cliente</Link>
                  <button type="button" onClick={onPrint}><LuPrinter aria-hidden />Imprimir</button>
                </div>
              </section>

              <section className={s.mSummarySection}>
                <div className={s.mSummaryHeading}><h2>Componentes con pauta</h2><span>{summary.items.length} de {summary.totalItems}</span></div>
                {summary.items.length > 0 ? (
                  <div className={s.mCardStack}>
                    {summary.items.map((row) => <ComponentCard
                      key={row.itemId}
                      row={row}
                      onOpen={() => { setDetailItemId(row.itemId); setDetailTab("resumen"); }}
                      onOpenDespiece={() => onOpenDespiece(row.itemId)}
                    />)}
                  </div>
                ) : <p className={s.mEmpty}>{summary.compositionsPendingRecipe.length > 0 ? "No hay componentes con pauta compatible para esta composición." : "Esta cotización aún no tiene pauta de fabricación guardada."}</p>}
              </section>

              <section className={s.mTotals} aria-label="Indicadores del trabajo">
                <SummaryMetricCell label="Perfiles" value={formatMl(summary.totalProfilesMl)} />
                <SummaryMetricCell label="Vidrio" value={formatM2(summary.totalGlassM2)} />
                <SummaryMetricCell label="Tiras" value={summary.totalBars == null ? "—" : String(summary.totalBars)} />
                <SummaryMetricCell label="Con pauta" value={`${summary.items.length}/${summary.totalItems}`} />
              </section>
            </div>
            {summary.compositionsPendingRecipe.length > 0 ? (
              <section className={s.compositionReviewNotice} aria-label="Composiciones pendientes de receta">
                <strong>Composición por revisar</strong>
                <p>La pauta queda pendiente hasta tener una receta compatible.</p>
                <details>
                  <summary>Ver {summary.compositionsPendingRecipe.length} {summary.compositionsPendingRecipe.length === 1 ? "componente" : "componentes"}</summary>
                  <ul>{summary.compositionsPendingRecipe.map((item) => <li key={item.itemId}>{item.codigo} · {item.nombre}</li>)}</ul>
                </details>
              </section>
            ) : null}
          </section>
        )}
      </div>

      <GlassSheetFormatDialog
        open={glassDistribution.formatDialogOpen}
        onOpenChange={glassDistribution.setFormatDialogOpen}
        onSubmit={glassDistribution.confirmFormat}
        isSubmitting={glassDistribution.isGenerating}
      />
    </div>
  );
}
