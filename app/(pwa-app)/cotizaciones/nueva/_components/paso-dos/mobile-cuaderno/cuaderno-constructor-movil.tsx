"use client";

import { useMemo, useState } from "react";
import { LuChevronDown, LuChevronLeft, LuEllipsis, LuPencilRuler } from "react-icons/lu";

import { LineTemplatePicker } from "@/features/cotizaciones/line-templates/components/line-template-picker";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  buildPieceDomainView,
  getPiecePresentationMeta,
} from "@/features/cotizaciones/new-quote/quote-piece-domain";
import { COLOR_OPTIONS, mapItemToForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { GlassOptionPicker } from "@/features/cotizaciones/visual-composer/components/glass-option-picker";
import {
  createQuoteConstructorPresetConfig,
  getQuoteConstructorItemConfig,
  type QuoteConstructorItemPatch,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import {
  listLeafModules,
  setGuidedVisualDimensions,
  updateModuleOpeningSide,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

import { useMobileViewportStability } from "../../../_hooks/use-mobile-viewport-stability";
import { CuadernoComposicionMovil } from "./cuaderno-composicion-movil";
import s from "./paso-dos-cuaderno-movil.module.css";

type SectionId =
  | "identificacion"
  | "sistema"
  | "vidrio"
  | "apertura"
  | "cubicacion"
  | "precio";

type SectionStatus = "ready" | "pending" | "optional";

type Props = {
  item: CotizacionWorkflowItem;
  quotePricingMode: QuotePricingMode;
  lineTemplates: CotizacionLineTemplate[];
  glassOptions: readonly string[];
  formatCurrencyInput: (value: string) => string;
  onUpdateItem: (itemId: string, patch: QuoteConstructorItemPatch) => void;
  onClose: () => void;
  onSaved: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onOpenDespieceReview?: (itemId: string) => void;
};

const SECTIONS: { id: SectionId; title: string }[] = [
  { id: "identificacion", title: "Identificación" },
  { id: "sistema", title: "Sistema y material" },
  { id: "vidrio", title: "Vidrio y color" },
  { id: "apertura", title: "Apertura y composición" },
  { id: "cubicacion", title: "Cubicación y despiece" },
  { id: "precio", title: "Precio" },
];

function sectionStatus(
  sectionId: SectionId,
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode
): SectionStatus {
  const view = buildPieceDomainView(item, pricingMode);
  if (sectionId === "apertura") return "optional";
  if (sectionId === "precio" && pricingMode === "total_global") return "optional";
  if (sectionId === "identificacion") return item.nombre.trim() ? "ready" : "pending";
  if (sectionId === "sistema") {
    const meta = getPiecePresentationMeta(item);
    return meta.lineTemplateId || item.lineaComercial.trim() ? "ready" : "pending";
  }
  if (sectionId === "vidrio") return item.vidrio.trim() ? "ready" : "pending";
  if (sectionId === "precio") {
    return pricingMode === "por_item" && item.precioUnitario <= 0 ? "pending" : "ready";
  }
  if (sectionId === "cubicacion") {
    return view.technicalStatus === "configurado" || view.technicalStatus === "sin_reglas"
      ? "ready"
      : "pending";
  }
  return "ready";
}

function statusClass(status: SectionStatus) {
  if (status === "ready") return s.accStatusReady;
  if (status === "pending") return s.accStatusPending;
  return s.accStatusOptional;
}

function statusLabel(status: SectionStatus) {
  if (status === "ready") return "Listo";
  if (status === "pending") return "Pendiente";
  return "Opcional";
}

export function CuadernoConstructorMovil({
  item,
  quotePricingMode,
  lineTemplates,
  glassOptions,
  formatCurrencyInput,
  onUpdateItem,
  onClose,
  onSaved,
  onDuplicate,
  onRemove,
  onOpenDespieceReview,
}: Props) {
  useMobileViewportStability();
  const [openSection, setOpenSection] = useState<SectionId | null>("identificacion");
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const form = useMemo(() => mapItemToForm(item), [item]);
  const config = useMemo(() => {
    const existing = getQuoteConstructorItemConfig(item);
    if (existing) {
      return setGuidedVisualDimensions(existing, {
        widthMm: item.ancho || existing.widthMm,
        heightMm: item.alto || existing.heightMm,
      });
    }
    return createQuoteConstructorPresetConfig("fijo", {
      widthMm: item.ancho || 1200,
      heightMm: item.alto || 1000,
    });
  }, [item]);

  const pendingCount = useMemo(() => {
    return SECTIONS.filter(
      (section) => sectionStatus(section.id, item, quotePricingMode) === "pending"
    ).length;
  }, [item, quotePricingMode]);

  const cubicacionDomain = useMemo(
    () => buildPieceDomainView(item, quotePricingMode),
    [item, quotePricingMode]
  );

  const svg = useMemo(
    () =>
      renderGuidedVisualSvg(config, {
        variant: "summary",
        showDimensions: true,
        maxW: 300,
        maxH: 160,
        colorHex: form.colorHex,
      }),
    [config, form.colorHex]
  );

  const toggle = (id: SectionId) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  const updateOpening = (side: "left" | "right") => {
    const leaf = listLeafModules(config.root)[0];
    if (!leaf) return;
    onUpdateItem(item.id, {
      guidedVisualConfig: updateModuleOpeningSide(config, leaf.id, side),
    });
  };

  const applyComposition = (next: GuidedVisualConfig) => {
    onUpdateItem(item.id, {
      ancho: String(next.widthMm),
      alto: String(next.heightMm),
      guidedVisualConfig: next,
    });
    setCompositionOpen(false);
  };

  if (compositionOpen) {
    return (
      <CuadernoComposicionMovil
        initialConfig={config}
        onApply={applyComposition}
        onClose={() => setCompositionOpen(false)}
      />
    );
  }

  return (
    <div className={s.fullScreen} role="dialog" aria-modal="true" aria-label="Constructor">
      <div className={s.fsHeader}>
        <button type="button" className={s.iconBtn} aria-label="Volver" onClick={onClose}>
          <LuChevronLeft size={20} />
        </button>
        <h2 className={s.fsTitle}>{item.nombre || "Pieza"}</h2>
        <div className={s.menuWrap}>
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Más acciones"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <LuEllipsis size={18} />
          </button>
          {menuOpen ? (
            <div className={s.menuPop} role="menu">
              <button
                type="button"
                className={s.menuItem}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
              >
                Duplicar
              </button>
              <button
                type="button"
                className={`${s.menuItem} ${s.menuItemDanger}`}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onRemove();
                }}
              >
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className={s.fsBody}>
        <div className={s.previewCard}>
          <div className={s.previewSvg} dangerouslySetInnerHTML={{ __html: svg }} />
          <p className={s.previewDims}>
            {item.ancho || "—"} × {item.alto || "—"} mm · ×{Math.max(1, item.cantidad)}
          </p>
        </div>

        {pendingCount > 0 ? (
          <div className={s.alertBanner}>
            <span>
              Falta completar {pendingCount} dato{pendingCount === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              className={s.secondaryBtn}
              style={{ minHeight: 36, padding: "0.35rem 0.75rem" }}
              onClick={() => {
                const first = SECTIONS.find(
                  (section) => sectionStatus(section.id, item, quotePricingMode) === "pending"
                );
                if (first) setOpenSection(first.id);
              }}
            >
              Revisar
            </button>
          </div>
        ) : null}

        <div className={s.accordion}>
          {SECTIONS.map((section) => {
            const status = sectionStatus(section.id, item, quotePricingMode);
            const isOpen = openSection === section.id;
            return (
              <div key={section.id} className={s.accItem}>
                <button
                  type="button"
                  className={s.accHead}
                  aria-expanded={isOpen}
                  onClick={() => toggle(section.id)}
                >
                  <span>{section.title}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className={`${s.accStatus} ${statusClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                    <LuChevronDown
                      size={18}
                      aria-hidden
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "none",
                        transition: "transform var(--cq-motion)",
                      }}
                    />
                  </span>
                </button>

                {isOpen ? (
                  <div className={s.accBody}>
                    {section.id === "identificacion" ? (
                      <label className={s.field}>
                        <span className={s.fieldLabel}>Nombre</span>
                        <input
                          className={s.fieldInput}
                          defaultValue={item.nombre}
                          key={`nombre-${item.id}-${item.nombre}`}
                          onBlur={(event) => {
                            const value = event.currentTarget.value.trim().slice(0, 120);
                            if (value && value !== item.nombre) {
                              onUpdateItem(item.id, { nombre: value });
                            }
                          }}
                        />
                      </label>
                    ) : null}

                    {section.id === "sistema" ? (
                      <>
                        <div className={s.field}>
                          <span className={s.fieldLabel}>Línea comercial</span>
                          <LineTemplatePicker
                            templates={lineTemplates.filter(
                              (template) => template.categoria !== "vidrio"
                            )}
                            value={form.lineTemplateId}
                            onChange={(lineTemplateId) =>
                              onUpdateItem(item.id, { lineTemplateId })
                            }
                            mode="profile"
                            ariaLabel="Elegir línea comercial"
                          />
                        </div>
                        <label className={s.field}>
                          <span className={s.fieldLabel}>Material</span>
                          <select
                            className={s.select}
                            value={form.material}
                            onChange={(event) =>
                              onUpdateItem(item.id, {
                                material: event.target.value as "Aluminio" | "PVC",
                              })
                            }
                          >
                            <option value="Aluminio">Aluminio</option>
                            <option value="PVC">PVC</option>
                          </select>
                        </label>
                      </>
                    ) : null}

                    {section.id === "vidrio" ? (
                      <>
                        <div className={s.field}>
                          <span className={s.fieldLabel}>Vidrio</span>
                          <GlassOptionPicker
                            options={glassOptions}
                            value={form.vidrio}
                            onChange={(vidrio) => onUpdateItem(item.id, { vidrio })}
                            ariaLabel="Elegir tipo de vidrio"
                            placeholder="Elegir vidrio"
                          />
                        </div>
                        <div className={s.field}>
                          <span className={s.fieldLabel}>Color del perfil</span>
                          <div className={s.colorGrid} role="group" aria-label="Colores">
                            {COLOR_OPTIONS.map((color) => {
                              const active =
                                color.hex.toLowerCase() === form.colorHex.toLowerCase();
                              return (
                                <button
                                  key={color.hex}
                                  type="button"
                                  className={`${s.colorSwatch} ${active ? s.colorSwatchActive : ""}`}
                                  aria-label={color.label}
                                  aria-pressed={active}
                                  onClick={() =>
                                    onUpdateItem(item.id, { colorHex: color.hex })
                                  }
                                >
                                  <span
                                    className={s.colorSwatchDot}
                                    style={{ backgroundColor: color.hex }}
                                    aria-hidden
                                  />
                                  <span className={s.colorName}>{color.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {section.id === "apertura" ? (
                      <>
                        <div className={s.field}>
                          <span className={s.fieldLabel}>Sentido de apertura</span>
                          <div className={s.sheetActions}>
                            <button
                              type="button"
                              className={s.secondaryBtn}
                              onClick={() => updateOpening("left")}
                            >
                              Izquierda
                            </button>
                            <button
                              type="button"
                              className={s.secondaryBtn}
                              onClick={() => updateOpening("right")}
                            >
                              Derecha
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={s.constructorLink}
                          onClick={() => setCompositionOpen(true)}
                        >
                          <span>
                            <p className={s.constructorLinkTitle}>Editar composición</p>
                            <p className={s.constructorLinkHelp}>
                              Parte módulos e iguala en pantalla completa.
                            </p>
                          </span>
                          <LuPencilRuler size={18} aria-hidden />
                        </button>
                      </>
                    ) : null}

                    {section.id === "cubicacion" ? (
                      <div className={s.despieceMobileBlock}>
                        <p className={s.emptyHelp} style={{ textAlign: "left", margin: 0 }}>
                          {cubicacionDomain.technicalLabel}
                        </p>
                        {cubicacionDomain.technicalSummary.hasSnapshot ? (
                          <dl className={s.despieceMobileMetrics}>
                            <div>
                              <dt>Cortes</dt>
                              <dd>{cubicacionDomain.technicalSummary.cortes}</dd>
                            </div>
                            <div>
                              <dt>Perfiles</dt>
                              <dd>
                                {cubicacionDomain.technicalSummary.mlPerfiles.toLocaleString(
                                  "es-CL",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}{" "}
                                ml
                              </dd>
                            </div>
                            <div>
                              <dt>Barras</dt>
                              <dd>
                                {cubicacionDomain.technicalSummary.barras > 0
                                  ? cubicacionDomain.technicalSummary.barras
                                  : "—"}
                              </dd>
                            </div>
                          </dl>
                        ) : null}
                        {onOpenDespieceReview ? (
                          <button
                            type="button"
                            className={s.constructorLink}
                            onClick={() => onOpenDespieceReview(item.id)}
                          >
                            <span>
                              <p className={s.constructorLinkTitle}>Ver despiece</p>
                              <p className={s.constructorLinkHelp}>
                                Pauta de corte y consolidado (solo lectura).
                              </p>
                            </span>
                            <LuPencilRuler size={18} aria-hidden />
                          </button>
                        ) : (
                          <p className={s.emptyHelp} style={{ textAlign: "left" }}>
                            La pauta detallada se revisa al abrir el despiece o en desktop.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {section.id === "precio" && quotePricingMode === "por_item" ? (
                      <label className={s.field}>
                        <span className={s.fieldLabel}>Precio unitario</span>
                        <input
                          className={s.fieldInput}
                          inputMode="numeric"
                          defaultValue={
                            item.precioUnitario > 0
                              ? formatCurrencyInput(String(Math.round(item.precioUnitario)))
                              : ""
                          }
                          key={`precio-${item.id}-${item.precioUnitario}`}
                          onBlur={(event) => {
                            const value = event.currentTarget.value.replace(/[^\d]/g, "");
                            onUpdateItem(item.id, {
                              costoProveedorUnitario: value,
                              markPriceManual: true,
                            });
                          }}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.fsFooter}>
        <button
          type="button"
          className={s.primaryBtn}
          onClick={() => {
            onSaved();
            onClose();
          }}
        >
          Guardar pieza
        </button>
      </div>
    </div>
  );
}
