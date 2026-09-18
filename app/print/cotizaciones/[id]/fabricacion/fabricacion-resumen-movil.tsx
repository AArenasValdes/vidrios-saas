"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type HomeTab = "componentes" | "consolidado";
type DetailTab = "resumen" | "cortes" | "despiece";

type Props = {
  backHref: string;
  pdfHref: string;
  codigo: string;
  clienteNombre: string;
  obra: string;
  summary: FabricationQuoteSummary;
  items: CotizacionWorkflowItem[];
  isExporting: boolean;
  exportError: string | null;
  onDownload: () => void;
  onPrint: () => void;
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
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  ariaLabel: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className={s.mSegmented} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          className={value === option.id ? s.mSegmentedActive : s.mSegmentedButton}
          onClick={() => onChange(option.id)}
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
}: {
  row: FabricationSummaryItem;
  onOpen: () => void;
}) {
  const lineCaption = formatFabricationItemLineCaption(row.lineName, row.material);
  const unitLabel = row.quantity === 1 ? "unidad" : "unidades";

  return (
    <button
      type="button"
      className={s.mPieceCard}
      onClick={onOpen}
      aria-label={`Ver detalle de ${row.codigo} · ${row.nombre}`}
    >
      <div className={s.mPieceCardBody}>
        <p className={s.mPieceTitle}>
          {row.codigo} · {row.nombre}
        </p>
        <p className={s.mPieceLine}>{lineCaption}</p>
        <p className={s.mPieceMeta}>
          {row.widthMm} × {row.heightMm} mm · {row.quantity} {unitLabel}
        </p>
        <div className={s.mPieceMetrics}>
          <MetricCell label="Perfiles" value={formatMl(row.profilesMl)} />
          <MetricCell label="Vidrio" value={formatM2(row.glassM2)} />
          <MetricCell
            label="Tiras"
            value={formatTirasNecesariasLabel(row.barCount, row.snapshot.bars)}
          />
        </div>
        <p className={s.mPieceStatus}>Pauta lista</p>
      </div>
      <LuChevronRight aria-hidden className={s.mChevron} />
    </button>
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

function ConsolidadoView({ summary }: { summary: FabricationQuoteSummary }) {
  const consolidated = useMemo(
    () =>
      buildConsolidatedCubicationPautaFromSnapshots(
        summary.items.map((row) => ({
          codigo: row.codigo,
          lineaComercial: row.lineName,
          nombre: row.nombre,
          snapshot: row.snapshot,
        }))
      ),
    [summary.items]
  );

  if (consolidated.lineGroups.length === 0) {
    return (
      <p className={s.mEmpty}>
        Todavía no hay despiece consolidable. Revisa piezas con línea, medidas y cortes.
      </p>
    );
  }

  return (
    <div className={s.mStack}>
      <section className={s.mGroup} aria-label="Qué fabricar">
        <h3>Qué necesito fabricar</h3>
        <div className={s.mNeedGrid}>
          <MetricCell label="Perfiles" value={formatMl(summary.totalProfilesMl)} />
          <MetricCell label="Tiras" value={String(consolidated.totalBars)} />
          <MetricCell label="Sobrantes" value={formatMm(consolidated.totalWasteMm)} />
          <MetricCell label="Vidrio" value={formatM2(consolidated.totalGlassM2)} />
        </div>
      </section>

      {consolidated.lineGroups.map((group) => (
        <section
          key={group.lineTemplateId || group.lineName}
          className={s.mGroup}
          aria-label={group.lineName}
        >
          <h3>{group.lineName}</h3>
          <p className={s.mGroupNote}>
            {formatMl(group.totalLinealMm / 1000)} · {group.bars} tiras · sobra{" "}
            {formatMm(group.wasteMm)}
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
    </div>
  );
}

export function FabricacionResumenMovil({
  backHref,
  pdfHref,
  codigo,
  clienteNombre,
  obra,
  summary,
  items,
  isExporting,
  exportError,
  onDownload,
  onPrint,
}: Props) {
  const [homeTab, setHomeTab] = useState<HomeTab>("componentes");
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("resumen");

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
        <>
          <section className={s.mTotals} aria-label="Totales">
            <MetricCell label="Perfiles" value={formatMl(summary.totalProfilesMl)} />
            <MetricCell label="Vidrio" value={formatM2(summary.totalGlassM2)} />
            <MetricCell label="Tiras" value={String(summary.totalBars)} />
            <MetricCell label="Componentes" value={String(summary.items.length)} />
          </section>
          <div className={s.mSegmentWrap}>
            <SegmentedControl
              value={homeTab}
              ariaLabel="Vista de fabricación"
              options={[
                { id: "componentes", label: "Componentes" },
                { id: "consolidado", label: "Consolidado" },
              ]}
              onChange={setHomeTab}
            />
          </div>
        </>
      ) : (
        <div className={s.mSegmentWrap}>
          <SegmentedControl
            value={detailTab}
            ariaLabel="Detalle del componente"
            options={[
              { id: "resumen", label: "Resumen" },
              { id: "cortes", label: "Cortes" },
              { id: "despiece", label: "Despiece" },
            ]}
            onChange={setDetailTab}
          />
        </div>
      )}

      {exportError ? <p className={s.mExportNotice}>{exportError}</p> : null}

      <div className={s.mContent}>
        {detailRow ? (
          detailTab === "resumen" ? (
            <DetailResumen row={detailRow} sourceItem={detailSource} />
          ) : detailTab === "cortes" ? (
            <DetailCortes row={detailRow} />
          ) : (
            <DetailDespiece row={detailRow} />
          )
        ) : summary.items.length === 0 ? (
          <p className={s.mEmpty}>
            Esta cotización aún no tiene pauta de fabricación congelada en las piezas.
          </p>
        ) : homeTab === "componentes" ? (
          <div className={s.mCardStack}>
            {summary.items.map((row) => (
              <ComponentCard
                key={row.itemId}
                row={row}
                onOpen={() => {
                  setDetailItemId(row.itemId);
                  setDetailTab("resumen");
                }}
              />
            ))}
          </div>
        ) : (
          <ConsolidadoView summary={summary} />
        )}
      </div>

      <footer className={s.mActions}>
        <button
          type="button"
          className={s.mActionPrimary}
          onClick={onDownload}
          disabled={isExporting}
        >
          <LuDownload aria-hidden />
          {isExporting ? "Generando..." : "Descargar resumen"}
        </button>
        <Link href={pdfHref} className={s.mActionGhost}>
          <LuFileText aria-hidden />
          PDF cliente
        </Link>
        <button type="button" className={s.mActionGhost} onClick={onPrint}>
          <LuPrinter aria-hidden />
          Imprimir
        </button>
      </footer>
    </div>
  );
}
