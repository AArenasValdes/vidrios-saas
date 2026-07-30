"use client";

import { memo, useMemo, useState } from "react";
import { LuEllipsis, LuPlus, LuX } from "react-icons/lu";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { isPieceCommerciallyComplete } from "@/features/cotizaciones/new-quote/quote-piece-domain";
import { mapItemToForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  QUOTE_CONSTRUCTOR_DOOR_PRESETS,
  QUOTE_CONSTRUCTOR_MORE_PRESETS,
  QUOTE_CONSTRUCTOR_PRIMARY_PRESETS,
  getQuoteConstructorItemConfig,
  type QuoteConstructorItemPatch,
  type QuoteConstructorPresetId,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

import { CuadernoComposicionMovil } from "./cuaderno-composicion-movil";
import { CuadernoConstructorMovil } from "./cuaderno-constructor-movil";
import {
  buildCuadernoPieceView,
  countIncompleteCuadernoPieces,
  findFirstIncompleteCuadernoPieceId,
} from "./cuaderno-piece-status";
import { CuadernoQuickEditSheet } from "./cuaderno-quick-edit-sheet";
import s from "./paso-dos-cuaderno-movil.module.css";

export type PasoDosCuadernoMovilProps = {
  items: CotizacionWorkflowItem[];
  quotePricingMode: QuotePricingMode;
  lineTemplates: CotizacionLineTemplate[];
  glassOptions: readonly string[];
  formatCurrencyInput: (value: string) => string;
  contextCliente?: string;
  contextObra?: string;
  onAddPreset: (preset: QuoteConstructorPresetId, lineTemplateId?: string) => string | null | void;
  onUpdateItem: (itemId: string, patch: QuoteConstructorItemPatch) => void;
  onApplyLineToItems: (lineTemplateId: string) => void;
  onDuplicateItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  onGoToSummary: () => void;
  /** Vuelve a la vista Guiada (lista + wizard). */
  onClose: () => void;
  /** Vuelve al selector por ítems vs cuadernillo. */
  onReturnToModeSelector?: () => void;
};

const PRIMARY_CHIPS = [
  ...QUOTE_CONSTRUCTOR_PRIMARY_PRESETS.filter((preset) => preset.id !== "pano_libre"),
  QUOTE_CONSTRUCTOR_DOOR_PRESETS[0],
].filter(Boolean);

const MOBILE_MORE_PRESETS = QUOTE_CONSTRUCTOR_MORE_PRESETS.filter(
  (preset) => preset.id !== "puerta_corredera"
);

function badgeClass(status: string) {
  if (status === "lista") return s.badgeLista;
  if (status === "falta_precio") return s.badgeFaltaPrecio;
  if (status === "faltan_datos") return s.badgeFaltanDatos;
  return s.badgeSinConfigurar;
}

function pieceThumb(item: CotizacionWorkflowItem) {
  const config =
    getQuoteConstructorItemConfig(item) ??
    createQuoteConstructorPresetConfig("fijo", {
      widthMm: item.ancho || 1200,
      heightMm: item.alto || 1000,
    });
  let colorHex: string | null = null;
  try {
    colorHex = mapItemToForm(item).colorHex;
  } catch {
    colorHex = null;
  }
  return renderGuidedVisualSvg(config, {
    variant: "thumbnail",
    maxW: 74,
    maxH: 58,
    colorHex,
    showDimensions: false,
    resourceKey: `piece-${item.id}-${colorHex ?? "default"}`,
  });
}

function presetThumb(presetId: QuoteConstructorPresetId) {
  return renderGuidedVisualSvg(createQuoteConstructorPresetConfig(presetId), {
    variant: "thumbnail",
    maxW: 38,
    maxH: 32,
    showDimensions: false,
  });
}

const PieceThumbnail = memo(function PieceThumbnail({ item }: { item: CotizacionWorkflowItem }) {
  const markup = useMemo(() => pieceThumb(item), [item]);

  return <div className={s.thumb} dangerouslySetInnerHTML={{ __html: markup }} aria-hidden />;
});

export function PasoDosCuadernoMovil({
  items,
  quotePricingMode,
  lineTemplates,
  glassOptions,
  formatCurrencyInput,
  contextCliente = "",
  contextObra = "",
  onAddPreset,
  onUpdateItem,
  onApplyLineToItems,
  onDuplicateItem,
  onRemoveItem,
  onGoToSummary,
  onClose,
}: PasoDosCuadernoMovilProps) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quickEditItemId, setQuickEditItemId] = useState<string | null>(null);
  const [constructorItemId, setConstructorItemId] = useState<string | null>(null);
  const [compositionItemId, setCompositionItemId] = useState<string | null>(null);
  const [returnToQuickEditAfterConstructor, setReturnToQuickEditAfterConstructor] =
    useState(false);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [addPieceOpen, setAddPieceOpen] = useState(false);
  const [defaultLineTemplateId, setDefaultLineTemplateId] = useState("");
  const [linePanelOpen, setLinePanelOpen] = useState(false);
  const [pendingRemoveItemId, setPendingRemoveItemId] = useState<string | null>(null);

  const pendingRemoveItem = useMemo(
    () => items.find((item) => item.id === pendingRemoveItemId) ?? null,
    [items, pendingRemoveItemId]
  );

  const incompleteCount = countIncompleteCuadernoPieces(items, quotePricingMode);
  const allReady =
    items.length > 0 && items.every((item) => isPieceCommerciallyComplete(item, quotePricingMode));

  const quickEditItem = useMemo(
    () => items.find((item) => item.id === quickEditItemId) ?? null,
    [items, quickEditItemId]
  );
  const constructorItem = useMemo(
    () => items.find((item) => item.id === constructorItemId) ?? null,
    [items, constructorItemId]
  );
  const compositionItem = useMemo(
    () => items.find((item) => item.id === compositionItemId) ?? null,
    [items, compositionItemId]
  );
  const globalProfileLineTemplates = useMemo(
    () => lineTemplates.filter((template) => template.categoria !== "vidrio"),
    [lineTemplates]
  );
  const selectedLineTemplate = useMemo(
    () =>
      defaultLineTemplateId
        ? globalProfileLineTemplates.find((template) => String(template.id) === defaultLineTemplateId) ??
          null
        : null,
    [defaultLineTemplateId, globalProfileLineTemplates]
  );

  const visibleMenuItemId =
    menuItemId && items.some((item) => item.id === menuItemId) ? menuItemId : null;

  const openPiece = (itemId: string) => {
    setActiveItemId(itemId);
    setMenuItemId(null);
    setCompositionItemId(null);
    setConstructorItemId(null);
    setQuickEditItemId(itemId);
  };

  const openComposition = (itemId: string) => {
    setActiveItemId(itemId);
    setMenuItemId(null);
    setQuickEditItemId(null);
    setConstructorItemId(null);
    setCompositionItemId(itemId);
  };

  const requestRemoveItem = (itemId: string) => {
    setMenuItemId(null);
    setPendingRemoveItemId(itemId);
  };

  const confirmRemoveItem = () => {
    if (!pendingRemoveItemId) return;
    const itemId = pendingRemoveItemId;
    setPendingRemoveItemId(null);
    onRemoveItem(itemId);
    if (quickEditItemId === itemId) setQuickEditItemId(null);
    if (constructorItemId === itemId) setConstructorItemId(null);
    if (compositionItemId === itemId) setCompositionItemId(null);
    if (activeItemId === itemId) setActiveItemId(null);
  };

  const handleAddPreset = (presetId: QuoteConstructorPresetId) => {
    const createdId = onAddPreset(presetId, defaultLineTemplateId || undefined);
    setAddPieceOpen(false);
    if (typeof createdId === "string" && createdId) {
      setActiveItemId(createdId);
      if (presetId === "pano_libre") {
        setConstructorItemId(createdId);
        setQuickEditItemId(null);
      } else {
        setQuickEditItemId(createdId);
        setConstructorItemId(null);
      }
    }
  };

  const applyDefaultLineToItems = () => {
    if (!defaultLineTemplateId) return;
    onApplyLineToItems(defaultLineTemplateId);
  };

  const applyDefaultLineAndClose = () => {
    applyDefaultLineToItems();
    setLinePanelOpen(false);
  };

  const handleFooterPrimary = () => {
    if (!allReady) {
      const firstId = findFirstIncompleteCuadernoPieceId(items, quotePricingMode);
      if (firstId) openPiece(firstId);
      return;
    }
    onGoToSummary();
  };

  const handleCloseCuaderno = () => {
    setQuickEditItemId(null);
    setConstructorItemId(null);
    setCompositionItemId(null);
    setReturnToQuickEditAfterConstructor(false);
    setMenuItemId(null);
    setAddPieceOpen(false);
    onClose();
  };

  const closeConstructor = () => {
    const itemId = constructorItemId;
    setConstructorItemId(null);
    if (returnToQuickEditAfterConstructor && itemId) {
      setQuickEditItemId(itemId);
    }
    setReturnToQuickEditAfterConstructor(false);
  };

  const subtitle =
    [contextCliente.trim() && `Cliente: ${contextCliente.trim()}`, contextObra.trim()]
      .filter(Boolean)
      .join(" · ") || "Agrega piezas a tu cotización";

  const buildCompositionConfig = (item: CotizacionWorkflowItem) =>
    getQuoteConstructorItemConfig(item) ??
    createQuoteConstructorPresetConfig("fijo", {
      widthMm: item.ancho || 1200,
      heightMm: item.alto || 1000,
    });

  const compositionConfig = useMemo(
    () => (compositionItem ? buildCompositionConfig(compositionItem) : null),
    // Mantiene estable la composicion mientras se edita la misma pieza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compositionItem?.id]
  );

  const applyComposition = (item: CotizacionWorkflowItem, next: GuidedVisualConfig) => {
    onUpdateItem(item.id, {
      ancho: String(next.widthMm),
      alto: String(next.heightMm),
      guidedVisualConfig: next,
    });
    setActiveItemId(item.id);
    setCompositionItemId(null);
  };

  return (
    <section className={s.root} aria-label="Constructor de piezas">
      <header className={s.header}>
        <div
          className={s.workspaceTabs}
          role="tablist"
          aria-label="Cómo armar las piezas"
        >
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className={s.workspaceTab}
            onClick={handleCloseCuaderno}
          >
            Guiada
          </button>
          <button
            type="button"
            role="tab"
            aria-selected
            className={`${s.workspaceTab} ${s.workspaceTabActive}`}
          >
            Constructor
          </button>
        </div>

        <div className={s.headerTop}>
          <div>
            <p className={s.eyebrow}>Paso 2 / Componentes</p>
            <h1 className={s.title}>Constructor de piezas</h1>
            <p className={s.subtitle}>{subtitle}</p>
          </div>
          <button
            type="button"
            className={s.closeBtn}
            aria-label="Volver a cotizacion rapida"
            onClick={handleCloseCuaderno}
          >
            <LuX size={19} aria-hidden />
          </button>
        </div>
      </header>

      <div className={s.quickBar}>
        <button type="button" className={s.addBtn} onClick={() => setAddPieceOpen(true)}>
          <LuPlus size={18} aria-hidden />
          Agregar pieza
        </button>
      </div>

      <div className={s.globalLineBar}>
        <div className={s.globalLineMain}>
          <span>Linea para todas</span>
          <strong>{selectedLineTemplate?.nombre ?? "Sin linea global"}</strong>
          <em>{selectedLineTemplate ? "Lista para nuevas piezas" : "Opcional para todo el trabajo"}</em>
        </div>
        <button
          type="button"
          className={s.lineBtn}
          onClick={() => setLinePanelOpen((value) => !value)}
        >
          {defaultLineTemplateId ? "Cambiar" : "Elegir"}
        </button>
      </div>

      {linePanelOpen ? (
        <div className={s.linePanelRoot} role="dialog" aria-modal="true" aria-label="Linea para todas">
          <button
            type="button"
            className={s.linePanelScrim}
            aria-label="Cerrar selector de linea global"
            onClick={() => setLinePanelOpen(false)}
          />
          <div className={s.linePanel}>
          <div className={s.linePanelHandle} aria-hidden />
          <div className={s.linePanelHeader}>
            <div>
              <strong>Linea para todas</strong>
              <span>Se usa en piezas nuevas y puedes aplicarla a las actuales.</span>
            </div>
            <button
              type="button"
              className={s.linePanelClose}
              aria-label="Cerrar"
              onClick={() => setLinePanelOpen(false)}
            >
              <LuX size={17} aria-hidden />
            </button>
          </div>
          {globalProfileLineTemplates.length > 0 ? (
            <>
              <div className={s.lineChoiceList} role="radiogroup" aria-label="Elegir linea global">
                {globalProfileLineTemplates.map((template) => {
                  const active = String(template.id) === defaultLineTemplateId;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`${s.lineChoice} ${active ? s.lineChoiceActive : ""}`}
                      onClick={() => setDefaultLineTemplateId(String(template.id))}
                    >
                      <strong>{template.nombre}</strong>
                      <span>
                        {[template.proveedor, template.material, template.unidadCobro]
                          .filter(Boolean)
                          .join(" · ") || "Linea configurada"}
                      </span>
                      {template.precioM2Sugerido > 0 ? (
                        <em>${Math.round(template.precioM2Sugerido).toLocaleString("es-CL")}/m²</em>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className={s.linePanelActions}>
                <button
                  type="button"
                  className={s.lineApplyBtn}
                  disabled={!defaultLineTemplateId}
                  onClick={applyDefaultLineAndClose}
                >
                  Aplicar linea
                </button>
                <button
                  type="button"
                  className={s.lineGhostBtn}
                  onClick={() => {
                    setDefaultLineTemplateId("");
                    setLinePanelOpen(false);
                  }}
                >
                  Sin linea
                </button>
              </div>
            </>
          ) : (
            <p className={s.linePanelEmpty}>
              No hay lineas activas para elegir. Crea o activa una linea en Configuracion.
            </p>
          )}
          </div>
        </div>
      ) : null}

      <div className={s.content}>
        {items.length === 0 ? (
          <div className={s.emptyCard}>
            <div className={s.emptyIcon} aria-hidden>
              <LuPlus size={28} />
            </div>
            <p className={s.emptyTitle}>Elige una tipologia y toca Agregar</p>
            <p className={s.emptyHelp}>
              Agrega piezas a tu cotización de forma rápida y sencilla.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const view = buildCuadernoPieceView(item, quotePricingMode);
            const isActive = activeItemId === item.id;
            return (
              <div
                key={item.id}
                className={`${s.pieceCard} ${isActive ? s.pieceCardActive : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => openPiece(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPiece(item.id);
                  }
                }}
              >
                <PieceThumbnail item={item} />
                <div className={s.pieceBody}>
                  <p className={s.pieceName}>{item.nombre || "Sin nombre"}</p>
                  <p className={s.pieceMeta}>
                    {item.ancho || "—"} × {item.alto || "—"} mm · ×
                    {Math.max(1, item.cantidad)}
                  </p>
                  {item.lineaComercial.trim() ? (
                    <p className={s.pieceLine}>{item.lineaComercial.trim()}</p>
                  ) : null}
                  <span className={`${s.badge} ${badgeClass(view.priorityStatus)}`}>
                    {view.priorityLabel}
                  </span>
                </div>
                <div className={s.pieceSide}>
                  <div className={s.menuWrap}>
                    <button
                      type="button"
                      className={s.menuBtn}
                      aria-label={`Más acciones de ${item.nombre || "pieza"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuItemId((current) => (current === item.id ? null : item.id));
                      }}
                    >
                      <LuEllipsis size={18} />
                    </button>
                    {visibleMenuItemId === item.id ? (
                      <div className={s.menuPop} role="menu">
                        <button
                          type="button"
                          className={s.menuItem}
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            openComposition(item.id);
                          }}
                        >
                          Editar composicion
                        </button>
                        <button
                          type="button"
                          className={s.menuItem}
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuItemId(null);
                            onDuplicateItem(item);
                          }}
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className={`${s.menuItem} ${s.menuItemDanger}`}
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestRemoveItem(item.id);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className={s.footer}>
        <div className={s.footerMeta}>
          <span>
            {items.length} pieza{items.length === 1 ? "" : "s"}
            {incompleteCount > 0 ? (
              <span className={s.footerMetaWarn}>
                {" "}
                · {incompleteCount} incompleta{incompleteCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </span>
          {allReady ? <span style={{ color: "var(--cq-blue)" }}>Listo para resumen</span> : null}
        </div>
        <button
          type="button"
          className={s.primaryBtn}
          disabled={items.length === 0}
          onClick={handleFooterPrimary}
        >
          {items.length === 0
            ? "Continuar al resumen"
            : allReady
              ? "Continuar al resumen"
              : "Completar faltantes"}
        </button>
      </footer>

      {addPieceOpen ? (
        <div className={s.presetSheetRoot} role="dialog" aria-modal="true" aria-label="Agregar pieza">
          <button
            type="button"
            className={s.presetSheetScrim}
            aria-label="Cerrar selector de pieza"
            onClick={() => setAddPieceOpen(false)}
          />
          <div className={s.presetSheetPanel}>
            <div className={s.presetSheetHandle} aria-hidden />
            <div className={s.presetSheetHead}>
              <strong>Agregar pieza</strong>
              <span>Elige el tipo de pieza para sumarla al constructor.</span>
            </div>
            <div className={s.presetSheetGrid}>
              {[...PRIMARY_CHIPS, ...MOBILE_MORE_PRESETS].map((preset) =>
                preset ? (
                  <button
                    key={preset.id}
                    type="button"
                    className={s.presetSheetOption}
                    onClick={() => handleAddPreset(preset.id)}
                  >
                    <span
                      className={s.presetSheetVisual}
                      dangerouslySetInnerHTML={{ __html: presetThumb(preset.id) }}
                      aria-hidden
                    />
                    <span>{preset.label}</span>
                  </button>
                ) : null
              )}
              <button
                type="button"
                className={s.presetSheetOption}
                onClick={() => handleAddPreset("pano_libre")}
              >
                <span className={s.presetSheetIcon}>
                  <LuPlus size={18} aria-hidden />
                </span>
                <span>Composicion</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {quickEditItem ? (
        <CuadernoQuickEditSheet
          key={quickEditItem.id}
          item={quickEditItem}
          lineTemplates={lineTemplates}
          glassOptions={glassOptions}
          formatCurrencyInput={formatCurrencyInput}
          onClose={() => setQuickEditItemId(null)}
          onSave={(patch) => {
            onUpdateItem(quickEditItem.id, patch);
            setQuickEditItemId(null);
          }}
          onOpenConstructor={() => {
            setReturnToQuickEditAfterConstructor(false);
            setCompositionItemId(quickEditItem.id);
            setQuickEditItemId(null);
          }}
          onDuplicate={() => {
            onDuplicateItem(quickEditItem);
            setQuickEditItemId(null);
          }}
          onRemove={() => {
            requestRemoveItem(quickEditItem.id);
            setQuickEditItemId(null);
          }}
        />
      ) : null}

      {constructorItem ? (
        <CuadernoConstructorMovil
          item={constructorItem}
          quotePricingMode={quotePricingMode}
          lineTemplates={lineTemplates}
          glassOptions={glassOptions}
          formatCurrencyInput={formatCurrencyInput}
          onUpdateItem={onUpdateItem}
          onClose={closeConstructor}
          onSaved={() => setActiveItemId(constructorItem.id)}
          onDuplicate={() => onDuplicateItem(constructorItem)}
          onRemove={() => requestRemoveItem(constructorItem.id)}
        />
      ) : null}

      {compositionItem && compositionConfig ? (
        <CuadernoComposicionMovil
          initialConfig={compositionConfig}
          onApply={(next) => applyComposition(compositionItem, next)}
          onClose={() => setCompositionItemId(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingRemoveItemId)}
        title="¿Eliminar esta pieza?"
        description={
          pendingRemoveItem
            ? `Vas a quitar ${pendingRemoveItem.codigo}${
                pendingRemoveItem.nombre ? ` · ${pendingRemoveItem.nombre}` : ""
              } del presupuesto.`
            : "Vas a quitar esta pieza del presupuesto."
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={confirmRemoveItem}
        onCancel={() => setPendingRemoveItemId(null)}
      />

    </section>
  );
}
