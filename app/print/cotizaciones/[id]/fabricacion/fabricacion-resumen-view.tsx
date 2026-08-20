"use client";

import Link from "next/link";
import type { RefObject } from "react";
import {
  LuArrowLeft,
  LuArrowUpRight,
  LuBox,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuDownload,
  LuFileText,
  LuLayoutGrid,
  LuPrinter,
  LuRuler,
  LuSquare,
  LuWrench,
} from "react-icons/lu";

import {
  formatFabricationItemLineCaption,
  type FabricationQuoteSummary,
  type FabricationSummaryItem,
} from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import {
  herrajeDisplayLabel,
  RECIPE_MISSING_PROFILE_LABEL,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CotizacionLineTemplateCuttingBar } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getQuoteConstructorItemConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import s from "./page.module.css";

export function formatMl(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ml`;
}

export function formatM2(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
}

export function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

export function formatBarCutsLabel(count: number) {
  return `${count} ${count === 1 ? "corte" : "cortes"}`;
}

export function isUnassignedProfileLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase("es");
  return (
    !normalized ||
    normalized === "por asignar" ||
    normalized === RECIPE_MISSING_PROFILE_LABEL.toLocaleLowerCase("es")
  );
}

export function isValidatedFabricationStatus(label: string) {
  return label === "Validada" || label.startsWith("Validada");
}

type ProfileBarGroup = {
  key: string;
  label: string;
  code: string;
  barLengthMm: number | null;
  bars: CotizacionLineTemplateCuttingBar[];
};

function normalizeProfileText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function resolveBarIdentity(bar: CotizacionLineTemplateCuttingBar) {
  const explicitCode = normalizeProfileText(bar.profileCode);
  const cutLabels = Array.from(
    new Set(
      bar.cuts
        .map((cut) => normalizeProfileText(cut.label))
        .filter((label) => label && !isUnassignedProfileLabel(label))
    )
  );
  const hasMixedProfiles = cutLabels.length > 1 && !explicitCode;
  const code = explicitCode && !isUnassignedProfileLabel(explicitCode)
    ? explicitCode
    : hasMixedProfiles
      ? ""
      : cutLabels[0] ?? "";
  const functionLabel = normalizeProfileText(
    bar.cuts.find((cut) => normalizeProfileText(cut.functionLabel))?.functionLabel
  );
  const explicitName = normalizeProfileText(bar.profileName);
  const label = hasMixedProfiles
    ? "Varios perfiles"
    : explicitName || functionLabel || code || "Por asignar";
  const barLengthMm =
    typeof bar.barLengthMm === "number" && bar.barLengthMm > 0
      ? bar.barLengthMm
      : bar.usedMm + bar.wasteMm > 0
        ? bar.usedMm + bar.wasteMm
        : null;

  return { code, label, barLengthMm };
}

export function groupBarsByProfile(
  bars: CotizacionLineTemplateCuttingBar[]
): ProfileBarGroup[] {
  const groups = new Map<string, ProfileBarGroup>();

  bars.forEach((bar) => {
    const identity = resolveBarIdentity(bar);
    const key = `${identity.code || identity.label}::${identity.barLengthMm ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.bars.push(bar);
      return;
    }
    groups.set(key, {
      key,
      label: identity.label,
      code: identity.code,
      barLengthMm: identity.barLengthMm,
      bars: [bar],
    });
  });

  return Array.from(groups.values());
}

function formatBarCount(count: number) {
  return `${count} ${count === 1 ? "tira" : "tiras"}`;
}

type Props = {
  backHref: string;
  pdfHref: string;
  codigo: string;
  clienteNombre: string;
  obra: string;
  summary: FabricationQuoteSummary;
  items: CotizacionWorkflowItem[];
  expandedItemId: string | null;
  onToggleItem: (itemId: string) => void;
  onOpenDespiece: (itemId: string) => void;
  isExporting: boolean;
  exportError: string | null;
  documentRef: RefObject<HTMLElement | null>;
  onDownload: () => void;
  onPrint: () => void;
};

function PieceThumbnail({ item }: { item: CotizacionWorkflowItem }) {
  const config = getQuoteConstructorItemConfig(item);
  if (!config) return null;
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  return (
    <div
      className={s.thumb}
      aria-hidden
      dangerouslySetInnerHTML={{
        __html: renderGuidedVisualSvg(config, {
          maxW: 80,
          maxH: 80,
          variant: "thumbnail",
          colorHex: presentation.colorHex,
          showSelection: false,
          showDimensions: false,
          showLabels: false,
          resourceKey: `fabricacion-thumb-${item.id}`,
        }),
      }}
    />
  );
}

function StatusBadge({ label }: { label: string }) {
  const ok = isValidatedFabricationStatus(label);
  return (
    <em className={s.statusBadge} data-tone={ok ? "ok" : "neutral"}>
      {ok ? <LuCheck aria-hidden /> : null}
      {label}
    </em>
  );
}

function CubicacionMetrics({ row }: { row: FabricationSummaryItem }) {
  const profileGroups = groupBarsByProfile(row.snapshot.bars);

  return (
    <>
      <div className={s.cubicMetrics}>
        <div>
          <span>Perfiles</span>
          <strong>{formatMl(row.profilesMl)}</strong>
        </div>
        <div>
          <span>Vidrio</span>
          <strong>{formatM2(row.glassM2)}</strong>
        </div>
        <div>
          <span>Accesorios</span>
          <strong>{row.accessoryUnits} unidades</strong>
        </div>
        <div>
          <span>Tiras reales</span>
          <strong>{row.barCount}</strong>
        </div>
      </div>
      {profileGroups.length > 0 ? (
        <div className={s.profileStripSummary}>
          <div className={s.profileStripSummaryHead}>
            <span>Tiras por perfil</span>
            <strong>{row.barCount} reales</strong>
          </div>
          <ul>
            {profileGroups.map((group) => (
              <li key={group.key}>
                <span>{group.label}</span>
                {group.code ? <code>{group.code}</code> : null}
                <strong>{formatBarCount(group.bars.length)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function DespieceTable({ row }: { row: FabricationSummaryItem }) {
  return (
    <div className={s.tableScroll}>
      <table className={s.cutsTable}>
        <thead>
          <tr>
            <th>Perfil</th>
            <th>Función</th>
            <th>Medida</th>
            <th>Cant.</th>
            <th>Total lineal</th>
          </tr>
        </thead>
        <tbody>
          {row.snapshot.cuts.map((cut, index) => {
            const profile = cut.label || "Por asignar";
            const unassigned = isUnassignedProfileLabel(profile);
            return (
              <tr key={`${row.itemId}-${cut.label}-${index}`}>
                <td className={unassigned ? s.profileMuted : undefined}>{profile}</td>
                <td className={s.functionCell}>{cut.functionLabel || "—"}</td>
                <td>{formatMm(cut.lengthMm)}</td>
                <td>{cut.quantity}</td>
                <td>{formatMm(cut.totalLinealMm)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PautaRows({ row }: { row: FabricationSummaryItem }) {
  if (row.snapshot.bars.length === 0) {
    return <p className={s.pautaEmpty}>Esta pieza aún no tiene tiras sugeridas.</p>;
  }

  return (
    <div className={s.pautaGroups}>
      {groupBarsByProfile(row.snapshot.bars).map((group) => (
        <section key={group.key} className={s.pautaGroup}>
          <header className={s.pautaGroupHead}>
            <div>
              <strong>{group.label}</strong>
              {group.code ? <code>{group.code}</code> : null}
            </div>
            <span>
              {formatBarCount(group.bars.length)}
              {group.barLengthMm ? ` · ${formatMm(group.barLengthMm)}` : ""}
            </span>
          </header>
          <ul className={s.barList}>
            {group.bars.map((bar, index) => (
              <li key={`${row.itemId}-bar-${bar.index}`}>
                <strong>
                  Tira {index + 1} de {group.bars.length}
                </strong>
                <span>Usado {formatMm(bar.usedMm)}</span>
                <span>Sobra {formatMm(bar.wasteMm)}</span>
                <em>{formatBarCutsLabel(bar.cuts.length)}</em>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function FabricacionResumenView({
  backHref,
  pdfHref,
  codigo,
  clienteNombre,
  obra,
  summary,
  items,
  expandedItemId,
  onToggleItem,
  onOpenDespiece,
  isExporting,
  exportError,
  documentRef,
  onDownload,
  onPrint,
}: Props) {
  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.headerCopy}>
          <Link href={backHref} className={`${s.backLink} ${s.printHide}`}>
            <LuArrowLeft aria-hidden />
            <span>Volver</span>
          </Link>
          <p className={s.docEyebrow}>Uso interno · no enviar al cliente</p>
          <h1>Resumen de fabricación</h1>
          <p className={s.docContext}>
            {codigo}
            <span aria-hidden>·</span>
            {clienteNombre || "Sin cliente"}
            {obra ? (
              <>
                <span aria-hidden>·</span>
                Obra: {obra}
              </>
            ) : null}
          </p>
        </div>
        <div className={`${s.headerActions} ${s.printHide}`}>
          <Link href={pdfHref} className={s.secondaryButton}>
            <LuFileText aria-hidden />
            <span>PDF cliente</span>
          </Link>
          <button
            type="button"
            className={s.primaryButton}
            onClick={onDownload}
            disabled={isExporting}
          >
            <LuDownload aria-hidden />
            <span>{isExporting ? "Generando..." : "Descargar resumen"}</span>
          </button>
          <button type="button" className={s.secondaryButton} onClick={onPrint}>
            <LuPrinter aria-hidden />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      <article ref={documentRef} className={s.document}>
        <header className={s.printTitle}>
          <p className={s.docEyebrow}>Uso interno · no enviar al cliente</p>
          <h1>Resumen de fabricación</h1>
          <p className={s.docContext}>
            {codigo}
            <span aria-hidden>·</span>
            {clienteNombre || "Sin cliente"}
            {obra ? (
              <>
                <span aria-hidden>·</span>
                Obra: {obra}
              </>
            ) : null}
          </p>
        </header>

        {exportError ? (
          <p className={`${s.exportNotice} ${s.printHide}`}>{exportError}</p>
        ) : null}

        <section className={s.totalsStrip} aria-label="Resumen general">
          <div>
            <LuBox aria-hidden />
            <span>Perfiles totales</span>
            <strong>{formatMl(summary.totalProfilesMl)}</strong>
          </div>
          <div>
            <LuSquare aria-hidden />
            <span>Vidrio total</span>
            <strong>{formatM2(summary.totalGlassM2)}</strong>
          </div>
          <div>
            <LuWrench aria-hidden />
            <span>Accesorios</span>
            <strong>{summary.totalAccessoryUnits} unidades</strong>
          </div>
          <div>
            <LuRuler aria-hidden />
            <span>Tiras sugeridas</span>
            <strong>{summary.totalBars}</strong>
          </div>
          <div>
            <LuLayoutGrid aria-hidden />
            <span>Componentes</span>
            <strong>
              {summary.items.length} con pauta de {summary.totalItems}
            </strong>
          </div>
        </section>

        {summary.items.length === 0 ? (
          <p className={s.emptyState}>
            Esta cotización aún no tiene pauta de fabricación congelada en las piezas.
          </p>
        ) : (
          summary.items.map((row) => {
            const sourceItem = items.find((item) => item.id === row.itemId) ?? null;
            const lineCaption = formatFabricationItemLineCaption(row.lineName, row.material);
            const herraje =
              row.recipe
                ? herrajeDisplayLabel(row.recipe.herrajeTipo, row.recipe.herrajeLabel)
                : row.herrajeLabel;
            const expanded = expandedItemId === row.itemId;
            const unitLabel = row.quantity === 1 ? "unidad" : "unidades";

            return (
              <section
                key={row.itemId}
                className={`${s.itemCard} ${expanded ? s.itemCardOpen : ""}`}
              >
                <div
                  className={s.itemHead}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("button")) return;
                    onToggleItem(row.itemId);
                  }}
                >
                  {sourceItem ? <PieceThumbnail item={sourceItem} /> : null}
                  <div className={s.itemIdentity}>
                    <button
                      type="button"
                      className={s.itemTitle}
                      onClick={() => onOpenDespiece(row.itemId)}
                    >
                      {row.codigo} · {row.nombre}
                    </button>
                    <p className={s.itemLine}>{lineCaption}</p>
                    <p className={s.itemMeta}>
                      {row.widthMm} × {row.heightMm} mm · {row.quantity} {unitLabel}
                      {herraje && herraje !== "-" ? ` · ${herraje}` : ""}
                    </p>
                  </div>

                  <dl className={s.compactMetrics} aria-label={`Cubicación compacta de ${row.codigo}`}>
                    <div>
                      <dt>Perfiles</dt>
                      <dd>{formatMl(row.profilesMl)}</dd>
                    </div>
                    <div>
                      <dt>Vidrio</dt>
                      <dd>{formatM2(row.glassM2)}</dd>
                    </div>
                    <div>
                      <dt>Accesorios</dt>
                      <dd>{row.accessoryUnits}</dd>
                    </div>
                    <div>
                      <dt>Tiras</dt>
                      <dd>{row.barCount}</dd>
                    </div>
                  </dl>

                  <div className={s.itemHeadEnd}>
                    <StatusBadge label={row.statusLabel} />
                    <button
                      type="button"
                      className={`${s.toggle} ${s.printHide}`}
                      aria-expanded={expanded}
                      aria-controls={`fabricacion-${row.itemId}`}
                      onClick={() => onToggleItem(row.itemId)}
                    >
                      {expanded ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}
                      <span className={s.srOnly}>
                        {expanded ? "Ocultar detalle" : "Mostrar detalle"} de {row.codigo}
                      </span>
                    </button>
                  </div>
                </div>

                <div id={`fabricacion-${row.itemId}`} className={s.itemBody}>
                  <section className={s.block} aria-label={`Cubicación de ${row.codigo}`}>
                    <h3 className={s.cubicTitle}>
                      <span>1.</span> Cubicación
                    </h3>
                    <p className={s.blockHint}>Material necesario para fabricar esta pieza.</p>
                    <CubicacionMetrics row={row} />
                  </section>

                  <section className={s.block} aria-label={`Despiece de ${row.codigo}`}>
                    <div className={s.blockHead}>
                      <h3>
                        <button
                          type="button"
                          className={s.blockTitleButton}
                          onClick={() => onOpenDespiece(row.itemId)}
                        >
                          <span>2.</span> Despiece
                        </button>
                      </h3>
                      <button
                        type="button"
                        className={`${s.despieceCta} ${s.printHide}`}
                        onClick={() => onOpenDespiece(row.itemId)}
                        aria-label={`Ver despiece completo de ${row.codigo}`}
                      >
                        Ver despiece completo
                        <LuArrowUpRight aria-hidden />
                      </button>
                    </div>
                    <DespieceTable row={row} />
                  </section>

                  <section className={s.block} aria-label={`Pauta de corte de ${row.codigo}`}>
                    <h3>
                      <span>3.</span> Pauta de corte
                    </h3>
                    <p className={s.blockHint}>
                      Pauta sugerida de tiras. Verificar medidas en obra antes de cortar.
                    </p>
                    <PautaRows row={row} />
                  </section>
                </div>
              </section>
            );
          })
        )}

        <footer className={s.docFooter}>
          <p>
            Las longitudes incluyen cortes según la pauta sugerida. Verificar medidas en
            obra antes de fabricar.
          </p>
        </footer>
      </article>
    </>
  );
}
