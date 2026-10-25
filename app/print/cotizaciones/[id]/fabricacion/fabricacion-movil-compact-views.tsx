"use client";

import { useMemo, useState } from "react";
import { LuChevronRight } from "react-icons/lu";

import { buildConsolidatedCubicationPautaFromSnapshots } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type {
  WorkMaterialsDocument,
  WorkMaterialPrice,
} from "@/features/fabricacion/services/fabrication-work-materials.service";
import { calculateProfileReferenceTotal, resolveProfileSupplierPrice } from "@/features/fabricacion/services/work-materials-price-reference.service";
import type { FabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";
import { WorkDocumentExportActions } from "./work-materials-document-panel";
import { formatM2, formatMl, formatMm } from "./fabricacion-resumen-view";
import { resolveComponentColorName } from "@/constants/component-colors";

export function formatFinishName(finish?: string | null): string {
  if (!finish) return "";
  const trimmed = finish.trim();
  if (trimmed.startsWith("#")) {
    const resolved = resolveComponentColorName(trimmed);
    return resolved !== "Color a definir" ? resolved : "";
  }
  return trimmed;
}
import s from "./page.module.css";

export function isPriceValorized(price?: WorkMaterialPrice | null): boolean {
  if (!price) return false;
  return Boolean(
    price.isWorkshopCode ||
      price.sourceKind === "own" ||
      price.sourceKind === "adjusted"
  );
}

export function formatMoney(value: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function stripCodePrefix(label: string, code: string) {
  const trimmed = code.trim();
  if (!trimmed) return label;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return label.replace(new RegExp(`^${escaped}\\s*[-–]?\\s*`, "i"), "").trim() || label;
}

export function CompactMaterialsView({
  document,
  workOrder,
  companyName,
  quoteCode,
  work,
  issueDate,
}: {
  document: WorkMaterialsDocument;
  workOrder: FabricationWorkOrder;
  companyName: string;
  quoteCode: string;
  work: string;
  issueDate: string;
}) {
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const fileBase = `materiales-${sanitizeFileNamePart(quoteCode || "cotizacion", 32)}`;
  const totalBars = document.profiles.reduce((sum, p) => sum + p.bars, 0);
  const referenceTotals = new Map<string, { provider: string; currency: string; amount: number; profiles: number }>();
  for (const profile of document.profiles) {
    const supplierPrice = resolveProfileSupplierPrice(profile, document.profilePriceReferences);
    if (!supplierPrice) continue;
    const { unitPrice, currency, providerLabel: provider } = supplierPrice;
    const providerKey = supplierPrice.providerKey ?? provider;
    const amount = calculateProfileReferenceTotal(profile, { unitPrice, basis: supplierPrice.basis });
    if (amount == null) continue;
    const key = `${providerKey}:${currency}`;
    const current = referenceTotals.get(key) ?? { provider, currency, amount: 0, profiles: 0 };
    current.amount += amount;
    current.profiles += 1;
    referenceTotals.set(key, current);
  }

  return (
    <section className={s.mCompactSurface} aria-label="Listado de materiales">
      <header className={s.mCompactSectionHeader}>
        <div>
          <h2 className={s.mCompactSectionTitle}>Lista de materiales del trabajo</h2>
          <p className={s.mCompactSectionSubtitle}>
            {document.profiles.length} {document.profiles.length === 1 ? "perfil" : "perfiles"} ·{" "}
            {document.accessories.length} {document.accessories.length === 1 ? "accesorio" : "accesorios"}
          </p>
        </div>
        <WorkDocumentExportActions
          kind="materials"
          fileBase={fileBase}
          document={document}
          workOrder={workOrder}
          companyName={companyName}
          quoteCode={quoteCode}
          work={work}
          issueDate={issueDate}
          onError={setExportError}
          onStatus={setExportStatus}
        />
      </header>

      {exportError ? (
        <p role="alert" className={s.exportNotice}>
          {exportError}
        </p>
      ) : null}
      {exportStatus ? (
        <p role="status" className={s.documentActionStatus}>
          {exportStatus}
        </p>
      ) : null}

      <h3 className={s.mCompactSubhead}>
        Perfiles a comprar
        <span>{totalBars} {totalBars === 1 ? "tira" : "tiras"} en total</span>
      </h3>
      {referenceTotals.size > 0 ? (
        <div className={s.mReferenceTotalSummary} aria-label="Totales referenciales por proveedor">
          <span>Total referencial de perfiles</span>
          {[...referenceTotals.values()].map((total) => (
            <strong key={`${total.provider}:${total.currency}`}>
              {total.provider} · {formatMoney(total.amount, total.currency)}
            </strong>
          ))}
          <small>
            {document.profiles.reduce((sum, profile) => sum + (isPriceValorized(profile.price) ? 0 : 1), 0) === [...referenceTotals.values()].reduce((sum, total) => sum + total.profiles, 0)
              ? `${[...referenceTotals.values()].reduce((sum, total) => sum + total.profiles, 0)} perfiles con referencia`
              : `${[...referenceTotals.values()].reduce((sum, total) => sum + total.profiles, 0)} perfiles con referencia; total parcial`}
          </small>
        </div>
      ) : null}
      {document.profiles.length === 0 ? (
        <p className={s.mEmpty}>No hay tiras en una pauta conjunta guardada.</p>
      ) : (
        <ul className={s.mCompactList} aria-label="Perfiles y cantidades para comprar">
          {document.profiles.map((row) => {
            const hasPrice = Boolean(row.price);
            const valorized = isPriceValorized(row.price);
            const supplierReferencePrice = valorized ? null : resolveProfileSupplierPrice(row, document.profilePriceReferences);
            const referenceTotal = supplierReferencePrice
              ? calculateProfileReferenceTotal(row, { unitPrice: supplierReferencePrice.unitPrice, basis: supplierReferencePrice.basis })
              : null;
            const referenceStatus = document.profilePriceReferencesStatus === "loading"
              ? "Consultando precio de referencia…"
              : document.profilePriceReferencesStatus === "unavailable"
                ? "No se pudo consultar el precio de referencia"
                : document.profilePriceReferencesStatus === "loaded"
                  ? "Sin referencia exacta"
                  : "Precio pendiente";

            return (
              <li key={row.key} className={s.mCompactItem}>
                <div className={s.mCompactItemHead}>
                  <div className={s.mCompactItemTitleWrap}>
                    <span className={s.mCompactCodeBadge}>{row.code}</span>
                    <strong className={s.mCompactItemTitle}>{row.description}</strong>
                  </div>
                  <span className={s.mCompactItemQty}>
                    {row.bars} {row.bars === 1 ? "tira" : "tiras"}
                  </span>
                </div>

                <div className={s.mCompactItemMeta}>
                  <span>{row.line}</span>
                  {formatFinishName(row.finish) ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>Color aluminio: {formatFinishName(row.finish)}</span>
                    </>
                  ) : <><span aria-hidden>·</span><span>Color aluminio pendiente</span></>}
                  <span aria-hidden>·</span>
                  <span>Largo {formatMm(row.commercialLengthMm)}</span>
                </div>

                <div className={s.mCompactItemPriceRow}>
                  {valorized && hasPrice && row.price ? (
                    <>
                      <span className={s.mPriceTagValorized}>Costo valorizado</span>
                      <div className={s.mPriceFigures}>
                        <span className={s.mPriceUnit}>
                          {formatMoney(row.price.unitPrice, row.price.currency)} {row.price.basis}
                        </span>
                        <strong className={s.mPriceSubtotal}>
                          {formatMoney(row.price.subtotal, row.price.currency)}
                        </strong>
                      </div>
                    </>
                  ) : supplierReferencePrice ? (
                    <>
                      <span className={s.mPriceTagReferential}>
                        Proveedor · {supplierReferencePrice?.providerLabel}
                      </span>
                      <div className={`${s.mPriceFigures} ${s.mPriceFiguresReference}`}>
                        <span className={s.mPriceUnit}>
                          Unitario · {formatMoney(supplierReferencePrice!.unitPrice, supplierReferencePrice!.currency)} / {supplierReferencePrice!.basis}
                        </span>
                        {referenceTotal != null ? (
                          <strong className={s.mPriceSubtotal}>
                            Total referencial · {formatMoney(referenceTotal, supplierReferencePrice!.currency)}
                          </strong>
                        ) : (
                          <span className={s.mPriceUnit}>Total referencial no calculable con esta unidad</span>
                        )}
                      </div>
                    </>
                  ) : hasPrice && row.price ? (
                    <>
                      <span className={s.mPriceTagReferential}>Precio referencial</span>
                      <div className={s.mPriceFigures}>
                        <span className={s.mPriceUnit}>{formatMoney(row.price.unitPrice, row.price.currency)} {row.price.basis}</span>
                        <strong className={s.mPriceSubtotal}>{formatMoney(row.price.subtotal, row.price.currency)}</strong>
                      </div>
                    </>
                  ) : (
                    <span className={s.mPriceTagPending}>{referenceStatus}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {document.accessories.length > 0 ? (
        <>
          <h3 className={s.mCompactSubhead}>
            Accesorios
            <span>{document.accessories.length} partidas</span>
          </h3>
          <ul className={s.mCompactList} aria-label="Accesorios, cantidades y precios">
            {document.accessories.map((row) => {
              const hasPrice = Boolean(row.price);
              const valorized = isPriceValorized(row.price);

              return (
                <li key={row.key} className={s.mCompactItem}>
                  <div className={s.mCompactItemHead}>
                    <strong className={s.mCompactItemTitle}>{row.description}</strong>
                    <span className={s.mCompactItemQty}>
                      {row.quantity} {row.unit}
                    </span>
                  </div>

                  <div className={s.mCompactItemMeta}>
                    {row.code ? <span>Cód. {row.code}</span> : null}
                    {row.finish ? <span>{row.finish}</span> : null}
                    {row.line ? <span>{row.line}</span> : null}
                  </div>

                  <div className={s.mCompactItemPriceRow}>
                    {hasPrice && row.price ? (
                      <>
                        <span className={valorized ? s.mPriceTagValorized : s.mPriceTagReferential}>
                          {valorized ? "Costo valorizado" : "Precio referencial"}
                        </span>
                        <div className={s.mPriceFigures}>
                          <span className={s.mPriceUnit}>
                            {formatMoney(row.price.unitPrice, row.price.currency)} c/u
                          </span>
                          <strong className={s.mPriceSubtotal}>
                            {formatMoney(row.price.subtotal, row.price.currency)}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <span className={s.mPriceTagPending}>Sin precio valorizado</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {document.profilePriceReferences && document.profilePriceReferences.length > 0 ? (
        <details className={s.mReferencesDisclosure}>
          <summary className={s.mReferencesSummary}>
            <span>Referencias de compra ({document.profilePriceReferences.length})</span>
            <LuChevronRight aria-hidden className={s.mChevron} />
          </summary>
          <div className={s.mReferencesContent}>
            <p className={s.mReferencesNote}>
              Precios unitarios por perfil y presentación según catálogo de proveedores.
            </p>
            <ul className={s.mReferencesList} aria-label="Precios unitarios de perfiles por proveedor">
              {document.profilePriceReferences.map((ref) => (
                <li
                  key={ref.key}
                  className={ref.status === "priced" ? s.mReferenceItem : s.mReferenceItemPending}
                >
                  <div className={s.mRefHeading}>
                    <strong className={s.mRefCode}>{ref.technicalCode}</strong>
                    <span className={s.mRefName}>{ref.profileName}</span>
                  </div>
                  <div className={s.mRefMeta}>
                    <span>
                      {ref.providerLabel}
                      {ref.supplierSku ? ` · SKU ${ref.supplierSku}` : ""}
                    </span>
                    <span>
                      {formatFinishName(ref.finish) || "Acabado estándar"} · {ref.purchaseUnit || "Tira"}
                      {ref.commercialLengthMm ? ` (${formatMm(ref.commercialLengthMm)})` : ""}
                    </span>
                  </div>
                  <div className={s.mRefPrice}>
                    {ref.status === "priced" && ref.netPrice != null && ref.currency ? (
                      <strong>{formatMoney(ref.netPrice, ref.currency)}</strong>
                    ) : ref.status === "ambiguous" ? (
                      <span className={s.mRefAmbiguous}>Presentación ambigua</span>
                    ) : (
                      <span className={s.mRefPending}>Sin precio</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function CompactCutsView({
  summary,
  workOrder,
  materialsDocument,
  companyName,
  quoteCode,
  work,
  issueDate,
}: {
  summary: FabricationQuoteSummary;
  workOrder: FabricationWorkOrder;
  materialsDocument: WorkMaterialsDocument;
  companyName: string;
  quoteCode: string;
  work: string;
  issueDate: string;
}) {
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const fileBase = `cortes-perfiles-${sanitizeFileNamePart(quoteCode || "cotizacion", 32)}`;
  const cutGroups = workOrder.cutGroups;

  const totalWaste =
    summary.trabajoSnapshot?.totalWasteMm != null
      ? formatMm(summary.trabajoSnapshot.totalWasteMm)
      : cutGroups.some((g) => g.theoreticalRemnantMm != null)
        ? formatMm(cutGroups.reduce((acc, g) => acc + (g.theoreticalRemnantMm ?? 0), 0))
        : "—";

  const totalBarsCount =
    summary.trabajoSnapshot?.totalBars != null
      ? String(summary.trabajoSnapshot.totalBars)
      : summary.totalBars != null
        ? String(summary.totalBars)
        : "—";

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
      <section className={s.mCompactSurface} aria-label="Pauta de cortes de perfiles">
        <header className={s.mCompactSectionHeader}>
          <div>
            <h2 className={s.mCompactSectionTitle}>Pauta de cortes de perfiles</h2>
            <p className={s.mCompactSectionSubtitle}>
              {cutGroups.length}{" "}
              {cutGroups.length === 1 ? "tira o perfil" : "tiras o perfiles"} ·{" "}
              {workOrder.hasJointBars ? "Pauta conjunta" : "Por componente"}
            </p>
          </div>
          <WorkDocumentExportActions
            kind="profile-cuts"
            fileBase={fileBase}
            document={materialsDocument}
            workOrder={workOrder}
            companyName={companyName}
            quoteCode={quoteCode}
            work={work}
            issueDate={issueDate}
            onError={setExportError}
            onStatus={setExportStatus}
          />
        </header>

        {exportError ? (
          <p role="alert" className={s.exportNotice}>
            {exportError}
          </p>
        ) : null}
        {exportStatus ? (
          <p role="status" className={s.documentActionStatus}>
            {exportStatus}
          </p>
        ) : null}

        <div className={s.mCompactMetricStrip} aria-label="Totales de cortes">
          <div className={s.mCompactMetricCell}>
            <span className={s.mCompactMetricLabel}>Largo en cortes</span>
            <strong className={s.mCompactMetricValue}>{formatMl(summary.totalProfilesMl)}</strong>
          </div>
          <div className={s.mCompactMetricCell}>
            <span className={s.mCompactMetricLabel}>Tiras</span>
            <strong className={s.mCompactMetricValue}>{totalBarsCount}</strong>
          </div>
          <div className={s.mCompactMetricCell}>
            <span className={s.mCompactMetricLabel}>Sobrante teórico</span>
            <strong className={s.mCompactMetricValue}>{totalWaste}</strong>
          </div>
        </div>

        {cutGroups.length === 0 ? (
          <p className={s.mEmpty}>No hay cortes guardados para este trabajo.</p>
        ) : (
          <ul className={s.mCompactList} aria-label="Cortes agrupados por perfil">
            {cutGroups.map((group) => {
              const cutCount = group.cuts.reduce(
                (sum, cut) => sum + (cut.quantity > 0 ? cut.quantity : 1),
                0
              );
              return (
                <li key={group.key} className={s.mCutBarCard}>
                  <details>
                    <summary className={s.mCutBarSummary}>
                      <span className={s.mCompactCodeBadge}>{group.technicalCode}</span>
                      <div className={s.mCutBarInfo}>
                        <strong className={s.mCutBarTitle}>{group.profileName}</strong>
                        <span className={s.mCutBarMeta}>
                          {group.barIndex != null ? `Tira #${group.barIndex}` : "Por componente"}
                          {group.commercialLengthMm ? ` · ${formatMm(group.commercialLengthMm)}` : ""}
                          {formatFinishName(group.finish) ? ` · ${formatFinishName(group.finish)}` : ""}
                        </span>
                      </div>
                      <div className={s.mCutBarMetrics}>
                        {group.usedMm != null ? (
                          <span className={s.mCutUsed}>Usado {formatMm(group.usedMm)}</span>
                        ) : null}
                        {group.theoreticalRemnantMm != null ? (
                          <span className={s.mCutRemnant}>
                            Sobrante {formatMm(group.theoreticalRemnantMm)}
                          </span>
                        ) : null}
                      </div>
                      <LuChevronRight aria-hidden className={s.mChevron} />
                    </summary>

                    <div className={s.mCutBarDetails}>
                      <h4 className={s.mCutDetailsTitle}>
                        Cortes en esta tira ({cutCount}):
                      </h4>
                      {group.cuts.length > 0 ? (
                        <ul className={s.mCutDetailsList}>
                          {group.cuts.map((cut, cutIdx) => (
                            <li
                              key={`${group.key}-cut-${cutIdx}`}
                              className={s.mCutDetailItem}
                            >
                              <span className={s.mCutLengthBadge}>
                                {cut.quantity} × {formatMm(cut.lengthMm)}
                              </span>
                              <div className={s.mCutItemInfo}>
                                <strong className={s.mCutItemPiece}>{cut.itemCode}</strong>
                                <span className={s.mCutItemFunc}>{cut.functionName}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={s.mEmpty}>Sin cortes individuales guardados.</p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className={s.secondaryWorkshopDetails}>
        <summary>Ver pauta, cortes y sobrantes</summary>
        {consolidated.lineGroups.length === 0 ? (
          <p className={s.mEmpty}>
            Todavía no hay despiece consolidable. Revisa piezas con línea, medidas y cortes.
          </p>
        ) : (
          <>
            <section className={s.mGroup} aria-label="Qué fabricar">
              <h3>Qué necesito fabricar</h3>
              <div className={s.mNeedGrid}>
                <div className={s.mMetric}>
                  <span>Largo usado en cortes</span>
                  <strong>{formatMl(summary.totalProfilesMl)}</strong>
                </div>
                <div className={s.mMetric}>
                  <span>Tiras</span>
                  <strong>
                    {summary.trabajoSnapshot ? String(summary.trabajoSnapshot.totalBars) : "—"}
                  </strong>
                </div>
                <div className={s.mMetric}>
                  <span>Largos disponibles según pauta</span>
                  <strong>{formatMm(consolidated.totalWasteMm)}</strong>
                </div>
                <div className={s.mMetric}>
                  <span>Vidrio</span>
                  <strong>{formatM2(consolidated.totalGlassM2)}</strong>
                </div>
              </div>
            </section>

            {summary.trabajoSnapshot ? (
              <section className={s.mGroup} aria-label="Tiras compartidas del trabajo">
                <h3>Pauta conjunta · trabajo completo</h3>
                <p className={s.mGroupNote}>
                  {summary.trabajoSnapshot.totalBars} tiras compartidas entre partidas.
                </p>
                {summary.trabajoSnapshot.missingPresentations?.map((missing, index) => (
                  <p
                    className={s.mGroupNote}
                    key={`${missing.itemId}-${missing.technicalCode}-${missing.finishKey}-${index}`}
                  >
                    Presentación pendiente · {missing.technicalCode}: {missing.reason}
                  </p>
                ))}
                <ul className={s.mDespieceList}>
                  {summary.trabajoSnapshot.bars.map((bar) => (
                    <li
                      key={`${bar.materialKey}-${bar.acabadoKey}-${bar.largoComercialMm}-${bar.indice}`}
                    >
                      <strong>
                        {bar.supplierSku ? `${bar.supplierSku} · ${bar.codigoPerfil}` : bar.codigoPerfil} · Tira #{bar.indice} · {formatMm(bar.largoComercialMm)}
                      </strong>
                      <span>
                        Largo usado en cortes {formatMm(bar.usadoMm)} · Largo disponible según pauta {formatMm(bar.sobranteMm)}
                      </span>
                      {bar.cortes.map((cut, index) => (
                        <em
                          className={s.mBarTrace}
                          key={`${cut.itemId}-${cut.componenteId}-${index}`}
                        >
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
                <p className={s.mGroupNote}>
                  Esta cotización no conserva una distribución compartida. El histórico no se recalcula; revisa los cortes por componente.
                </p>
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

export function CompactGlassView({
  quoteId,
  quoteCode,
  clienteNombre,
  obra,
  document,
  workOrder,
  companyName,
  issueDate,
}: {
  quoteId: string;
  quoteCode: string;
  clienteNombre: string;
  obra: string;
  document: WorkMaterialsDocument;
  workOrder: FabricationWorkOrder;
  companyName: string;
  issueDate: string;
}) {
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const fileBase = `vidrios-${sanitizeFileNamePart(quoteCode || "cotizacion", 32)}`;

  const physicalPaneCount = document.glassOrder.reduce(
    (sum, row) => sum + (row.quantity ?? 0),
    0
  );

  return (
    <div className={s.mStack}>
      {/* Lista operativa compacta de Orden de vidrios (sin duplicación de documento) */}
      <section className={s.mCompactSurface} aria-label="Orden de vidrios">
        <header className={s.mCompactSectionHeader}>
          <div>
            <h2 className={s.mCompactSectionTitle}>Orden de vidrios</h2>
            <p className={s.mCompactSectionSubtitle}>
              {document.glassOrder.length} {document.glassOrder.length === 1 ? "tipo de paño" : "tipos de paño"}
              {physicalPaneCount > 0 ? ` · ${physicalPaneCount} unidades físicas` : " · cantidad física pendiente"}
            </p>
          </div>
          <WorkDocumentExportActions
            kind="glass-order"
            fileBase={fileBase}
            document={document}
            workOrder={workOrder}
            companyName={companyName}
            quoteCode={quoteCode}
            work={obra}
            issueDate={issueDate}
            onError={setExportError}
            onStatus={setExportStatus}
          />
        </header>

        {exportError ? (
          <p role="alert" className={s.exportNotice}>
            {exportError}
          </p>
        ) : null}
        {exportStatus ? (
          <p role="status" className={s.documentActionStatus}>
            {exportStatus}
          </p>
        ) : null}

        {document.glassOrder.length === 0 ? (
          <p className={s.mEmpty}>No hay vidrio ni composición registrada para ordenar.</p>
        ) : (
          <ul className={s.mGlassPaneList} aria-label="Orden de corte de vidrios">
            {document.glassOrder.map((row) => (
              <li key={row.key} className={s.mGlassPaneItem}>
                <div className={s.mGlassPaneHead}>
                  <div className={s.mGlassPaneRefWrap}>
                    <span className={s.mCompactCodeBadge}>{row.componentCode}</span>
                    <strong className={s.mGlassPaneRef}>{row.paneReference}</strong>
                    <span className={s.mGlassPaneComp}>{row.componentName}</span>
                  </div>
                  <span className={s.mGlassPaneQty}>
                    {row.quantity ?? "—"} {row.quantity === 1 ? "paño" : "paños"}
                  </span>
                </div>

                <div className={s.mGlassPaneBody}>
                  <strong className={s.mGlassPaneDims}>
                    {row.measuresPending || row.widthMm == null || row.heightMm == null
                      ? "Medidas pendientes"
                      : `${formatMm(row.widthMm)} × ${formatMm(row.heightMm)}`}
                  </strong>
                  <span className={s.mGlassPaneType}>{row.description}</span>
                </div>

                <div className={s.mGlassPaneFoot}>
                  <span>
                    {row.thickness ? `Espesor ${row.thickness}` : "Espesor pendiente"}
                    {formatFinishName(row.finish) ? ` · ${formatFinishName(row.finish)}` : ""}
                    {row.composition ? ` · ${row.composition}` : ""}
                  </span>
                  <span className={s.mGlassPaneArea}>
                    {row.totalM2 != null ? formatM2(row.totalM2) : "—"}
                  </span>
                </div>

                {row.thicknessWarning ? (
                  <p className={s.mGlassWarning}>{row.thicknessWarning}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
