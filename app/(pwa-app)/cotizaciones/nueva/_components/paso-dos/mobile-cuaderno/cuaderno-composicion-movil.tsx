"use client";

import { useEffect, useMemo, useState } from "react";
import { LuColumns2, LuFlipHorizontal2, LuRedo2, LuRows2, LuUndo2, LuX } from "react-icons/lu";

import { useGuidedVisualHistory } from "@/features/cotizaciones/visual-composer/hooks/use-guided-visual-history";
import {
  calculateGuidedVisualLayout,
  renderGuidedVisualSvg,
} from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import {
  QUOTE_CONSTRUCTOR_MORE_PRESETS,
  QUOTE_CONSTRUCTOR_PRIMARY_PRESETS,
  type QuoteConstructorPresetId,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  applyPalilloPresetToModule,
  applyQuickSplitRatio,
  clearModulePalillos,
  findNodeById,
  findParentSplit,
  isModuleNode,
  listLeafModules,
  resetGuidedComposition,
  selectGuidedNode,
  setGuidedFrameShape,
  setGuidedVisualDimensions,
  splitModule,
  updateModuleGlassShape,
  updateModuleOpeningSide,
  updateSplitRatio,
  updateModuleType,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

import { useMobileViewportStability } from "../../../_hooks/use-mobile-viewport-stability";
import s from "./paso-dos-cuaderno-movil.module.css";

type Props = {
  initialConfig: GuidedVisualConfig;
  onApply: (config: GuidedVisualConfig) => void;
  onClose: () => void;
};

const PRIMARY_CHIPS = QUOTE_CONSTRUCTOR_PRIMARY_PRESETS.filter(
  (preset) => preset.id !== "pano_libre"
);

const MOBILE_MORE_TYPE_CHIPS = [
  ...QUOTE_CONSTRUCTOR_MORE_PRESETS.filter((preset) => preset.id !== "puerta_corredera"),
  { id: "puerta" as const, label: "Puerta abatible" },
];

const REFLECTABLE_MODULE_TYPES = new Set<QuoteConstructorPresetId>([
  "abatible",
  "oscilobatiente",
  "puerta",
  "shower_frontal",
]);

function commitDimension(raw: string, fallback: number) {
  const value = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(250, Math.min(12000, value));
}

export function CuadernoComposicionMovil({ initialConfig, onApply, onClose }: Props) {
  const history = useGuidedVisualHistory(initialConfig);
  useMobileViewportStability();
  const [showMore, setShowMore] = useState(false);
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  useEffect(() => {
    history.reset(initialConfig);
    // Solo al montar / cambiar pieza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig]);

  const config = history.config;
  const widthValue = widthDraft ?? String(config.widthMm);
  const heightValue = heightDraft ?? String(config.heightMm);
  const selectedId = config.selectedNodeId;
  const selectedModule = useMemo(() => {
    if (!selectedId) return listLeafModules(config.root)[0] ?? null;
    const node = findNodeById(config.root, selectedId);
    return node && isModuleNode(node) ? node : listLeafModules(config.root)[0] ?? null;
  }, [config, selectedId]);
  const leafModules = useMemo(() => listLeafModules(config.root), [config.root]);

  const moduleIndex = useMemo(() => {
    if (!selectedModule) return 1;
    const idx = leafModules.findIndex((leaf) => leaf.id === selectedModule.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [leafModules, selectedModule]);
  const canReflectSelectedModule = selectedModule
    ? REFLECTABLE_MODULE_TYPES.has(selectedModule.type)
    : false;
  const openingSide = selectedModule?.openingSide === "right" ? "right" : "left";
  const openingSideLabel = openingSide === "right" ? "der." : "izq.";
  const nextOpeningSideLabel = openingSide === "right" ? "izq." : "der.";
  const showDoubleDoorTemplate =
    selectedModule?.type === "abatible" || selectedModule?.type === "puerta";
  const parentSplit = selectedModule ? findParentSplit(config.root, selectedModule.id) : null;
  const selectedIsFirstChild = Boolean(
    parentSplit && selectedModule && parentSplit.first.id === selectedModule.id
  );
  const selectedModuleShare = parentSplit
    ? selectedIsFirstChild
      ? parentSplit.ratio
      : 1 - parentSplit.ratio
    : 1;
  const selectedModuleShareLabel = Math.round(selectedModuleShare * 100);

  const svg = useMemo(
    () =>
      renderGuidedVisualSvg(config, {
        variant: "editor",
        showDimensions: false,
        showSelection: true,
        maxW: 360,
        maxH: 268,
      }),
    [config]
  );
  const layout = useMemo(
    () =>
      calculateGuidedVisualLayout(config, {
        variant: "editor",
        showDimensions: false,
        showSelection: true,
        maxW: 360,
        maxH: 268,
      }),
    [config]
  );

  const configWithDraftDimensions = (base = config) => {
    const widthMm = commitDimension(widthValue, base.widthMm);
    const heightMm = commitDimension(heightValue, base.heightMm);
    if (widthMm === base.widthMm && heightMm === base.heightMm) return base;
    return setGuidedVisualDimensions(base, { widthMm, heightMm });
  };

  const commitDimensions = () => {
    const next = configWithDraftDimensions();
    setWidthDraft(null);
    setHeightDraft(null);
    if (next !== config) history.setConfig(next);
  };

  const applyType = (type: QuoteConstructorPresetId) => {
    if (!selectedModule) return;
    history.setConfig(updateModuleType(configWithDraftDimensions(), selectedModule.id, type));
  };

  const split = (orientation: "horizontal" | "vertical") => {
    if (!selectedModule) return;
    history.setConfig(splitModule(configWithDraftDimensions(), selectedModule.id, orientation, 0.5));
  };

  const resizeSelectedModule = (delta: number) => {
    if (!selectedModule || !parentSplit) return;
    const nextShare = Math.max(0.12, Math.min(0.88, selectedModuleShare + delta));
    const nextRatio = selectedIsFirstChild ? nextShare : 1 - nextShare;
    history.setConfig(updateSplitRatio(configWithDraftDimensions(), parentSplit.id, nextRatio));
  };

  const selectModule = (moduleId: string) => {
    history.setConfig(selectGuidedNode(configWithDraftDimensions(), moduleId));
  };

  const reflectModule = () => {
    if (!selectedModule || !canReflectSelectedModule) return;
    const nextSide = openingSide === "right" ? "left" : "right";
    history.setConfig(
      updateModuleOpeningSide(configWithDraftDimensions(), selectedModule.id, nextSide)
    );
  };

  const equalize = () => {
    const nextConfig = configWithDraftDimensions();
    if (selectedModule) {
      const parent = findParentSplit(nextConfig.root, selectedModule.id);
      if (parent) {
        history.setConfig(applyQuickSplitRatio(nextConfig, parent.id, "equal"));
        return;
      }
    }
    if (nextConfig.root.kind === "split") {
      history.setConfig(applyQuickSplitRatio(nextConfig, nextConfig.root.id, "equal"));
    }
  };

  const reset = () => {
    setWidthDraft(null);
    setHeightDraft(null);
    history.setConfig(resetGuidedComposition(config));
  };

  const applyTopFixedDoubleDoorPreset = () => {
    const base = resetGuidedComposition(configWithDraftDimensions());
    const rootModule = listLeafModules(base.root)[0];
    if (!rootModule) return;

    let next = splitModule(base, rootModule.id, "horizontal", 0.28);
    const bottomModule = listLeafModules(next.root)[1];
    if (!bottomModule) return;

    next = splitModule(next, bottomModule.id, "vertical", 0.5);
    const leaves = listLeafModules(next.root);
    const leftDoor = leaves[1];
    const rightDoor = leaves[2];
    if (!leftDoor || !rightDoor) return;

    next = updateModuleType(next, leftDoor.id, "puerta");
    next = updateModuleType(next, rightDoor.id, "puerta");
    next = updateModuleOpeningSide(next, leftDoor.id, "left");
    next = updateModuleOpeningSide(next, rightDoor.id, "right");
    history.setConfig(selectGuidedNode(next, leftDoor.id));
  };

  const setFrameShape = (shape: "rect" | "arch_top" | "rounded") => {
    const nextConfig = configWithDraftDimensions();
    if (shape === "arch_top") {
      history.setConfig(setGuidedFrameShape(nextConfig, { kind: "arch_top", archRiseMm: 220 }));
      return;
    }
    if (shape === "rounded") {
      history.setConfig(
        setGuidedFrameShape(nextConfig, { kind: "rounded", radiusMm: 80, corners: "all" })
      );
      return;
    }
    history.setConfig(setGuidedFrameShape(nextConfig, { kind: "rect" }));
  };

  const setGlassShape = (shape: "rect" | "rounded") => {
    if (!selectedModule) return;
    const nextConfig = configWithDraftDimensions();
    history.setConfig(
      updateModuleGlassShape(
        nextConfig,
        selectedModule.id,
        shape === "rounded" ? { kind: "rounded", radiusMm: 40, corners: "all" } : { kind: "rect" }
      )
    );
  };

  const setPalillos = (preset: "none" | "v1" | "h1" | "cross" | "grid2x2") => {
    if (!selectedModule) return;
    const nextConfig = configWithDraftDimensions();
    history.setConfig(
      preset === "none"
        ? clearModulePalillos(nextConfig, selectedModule.id)
        : applyPalilloPresetToModule(nextConfig, selectedModule.id, preset)
    );
  };

  return (
    <div className={s.fullScreen} role="dialog" aria-modal="true" aria-label="Armar composicion">
      <div className={s.fsHeader}>
        <button type="button" className={s.iconBtn} aria-label="Volver" onClick={onClose}>
          <LuX size={18} />
        </button>
        <h2 className={s.fsTitle}>Armar composicion</h2>
      </div>

      <div className={s.fsBody} style={{ paddingTop: 0 }}>
        <div className={s.compStage}>
          <div className={s.compTopRow}>
            <div>
              <span>Seleccionado</span>
              <strong>M{moduleIndex}</strong>
            </div>
            <div className={s.historyActions}>
              <button
                type="button"
                className={s.iconMiniBtn}
                disabled={!history.canUndo}
                onClick={() => history.undo()}
                aria-label="Deshacer"
              >
                <LuUndo2 size={16} />
              </button>
              <button
                type="button"
                className={s.iconMiniBtn}
                disabled={!history.canRedo}
                onClick={() => history.redo()}
                aria-label="Rehacer"
              >
                <LuRedo2 size={16} />
              </button>
            </div>
          </div>

          <div className={s.dissectionBlock}>
            <div className={s.dissectionHead}>
              <strong>Diseccionar pieza</strong>
              <span>Trabaja sobre M{moduleIndex}</span>
            </div>
            <div className={s.compToolbar} aria-label="Diseccionar pieza">
              <button type="button" className={s.toolBtn} onClick={() => split("vertical")}>
                <LuColumns2 size={16} /> Partir lado
              </button>
              <button type="button" className={s.toolBtn} onClick={() => split("horizontal")}>
                <LuRows2 size={16} /> Partir alto
              </button>
              <button
                type="button"
                className={s.toolBtn}
                onClick={reflectModule}
                disabled={!canReflectSelectedModule}
                aria-label={
                  canReflectSelectedModule
                    ? `Reflejar apertura de M${moduleIndex}. Actualmente abre a la ${openingSideLabel}`
                    : `Reflejar no disponible en M${moduleIndex} sin apertura lateral`
                }
                title={
                  canReflectSelectedModule
                    ? `Cambiar apertura a ${nextOpeningSideLabel}`
                    : "Disponible en abatibles, puertas y shower frontal"
                }
              >
                <LuFlipHorizontal2 size={16} />
                <span className={s.toolBtnText}>Reflejar</span>
                <span className={s.toolBtnHint}>
                  {canReflectSelectedModule ? `Abre ${openingSideLabel}` : "Sin apertura"}
                </span>
              </button>
              <button type="button" className={s.toolBtn} onClick={equalize}>
                Igualar
              </button>
            </div>
            {parentSplit ? (
              <div className={s.resizeStrip} aria-label={`Ajustar tamano de M${moduleIndex}`}>
                <button
                  type="button"
                  className={s.resizeBtn}
                  onClick={() => resizeSelectedModule(-0.08)}
                >
                  Achicar M{moduleIndex}
                </button>
                <span>{selectedModuleShareLabel}%</span>
                <button
                  type="button"
                  className={s.resizeBtn}
                  onClick={() => resizeSelectedModule(0.08)}
                >
                  Agrandar M{moduleIndex}
                </button>
              </div>
            ) : null}
          </div>

          <div className={s.compPreviewBlock}>
            <div className={s.compCanvasInner}>
              <div className={s.compCanvasSvg} dangerouslySetInnerHTML={{ __html: svg }} />
              <div className={s.moduleTapLayer} aria-label="Seleccionar modulo del croquis">
                {layout.modules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    className={`${s.moduleTapTarget} ${
                      module.id === selectedModule?.id ? s.moduleTapTargetActive : ""
                    }`}
                    style={{
                      left: `${(module.x / layout.svgW) * 100}%`,
                      top: `${(module.y / layout.svgH) * 100}%`,
                      width: `${(module.w / layout.svgW) * 100}%`,
                      height: `${(module.h / layout.svgH) * 100}%`,
                    }}
                    aria-label={`Seleccionar area M${module.leafIndex + 1}`}
                    onClick={() => selectModule(module.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={s.dimensionGrid}>
            <label className={s.dimensionField}>
              <span className={s.dimensionLabel}>Ancho</span>
              <span className={s.dimensionInputWrap}>
                <input
                  aria-label="Ancho de la composicion"
                  inputMode="numeric"
                  value={widthValue}
                  onChange={(event) => setWidthDraft(event.target.value.replace(/[^\d]/g, ""))}
                  onFocus={(event) => event.currentTarget.select()}
                  onBlur={commitDimensions}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span className={s.dimensionUnit}>mm</span>
              </span>
            </label>
            <label className={s.dimensionField}>
              <span className={s.dimensionLabel}>Alto</span>
              <span className={s.dimensionInputWrap}>
                <input
                  aria-label="Alto de la composicion"
                  inputMode="numeric"
                  value={heightValue}
                  onChange={(event) => setHeightDraft(event.target.value.replace(/[^\d]/g, ""))}
                  onFocus={(event) => event.currentTarget.select()}
                  onBlur={commitDimensions}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span className={s.dimensionUnit}>mm</span>
              </span>
            </label>
          </div>
        </div>

        {layout.modules.length > 1 ? (
          <div className={s.moduleSwitcher} aria-label="Modulos de la composicion">
            {layout.modules.map((module) => (
              <button
                key={module.id}
                type="button"
                className={`${s.moduleSwitchBtn} ${
                  module.id === selectedModule?.id ? s.moduleSwitchBtnActive : ""
                }`}
                onClick={() => selectModule(module.id)}
              >
                M{module.leafIndex + 1}
              </button>
            ))}
          </div>
        ) : null}

        <div className={s.moduleControlsPanel}>
          <div className={s.moduleControlsHead}>
            <div>
              <span>Tipo de modulo</span>
              <strong>M{moduleIndex} seleccionado</strong>
            </div>
            <button type="button" className={s.resetLinkBtn} onClick={reset}>
              Reiniciar
            </button>
          </div>

          <div className={s.moduleTypeGrid}>
            {PRIMARY_CHIPS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`${s.chip} ${selectedModule?.type === preset.id ? s.chipActive : ""}`}
                aria-label={`Cambiar modulo M${moduleIndex} a ${preset.label}`}
                onClick={() => applyType(preset.id)}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className={`${s.chip} ${showMore ? s.chipActive : ""}`}
              onClick={() => setShowMore((value) => !value)}
            >
              Mas tipos
            </button>
          </div>

          {showMore ? (
            <div className={s.morePanel}>
              {MOBILE_MORE_TYPE_CHIPS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`${s.chip} ${
                    selectedModule?.type === preset.id ? s.chipActive : ""
                  }`}
                  aria-label={`Cambiar modulo M${moduleIndex} a ${preset.label}`}
                  onClick={() => applyType(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {showDoubleDoorTemplate ? (
          <div className={s.constructorControlGroup}>
            <div className={s.sheetSectionHead}>
              <strong>Composicion rapida</strong>
              <span>Dos hojas abatibles inferiores y fijo superior.</span>
            </div>
            <button
              type="button"
              className={s.wideTemplateBtn}
              onClick={applyTopFixedDoubleDoorPreset}
            >
              2 hojas + fijo superior
            </button>
          </div>
        ) : null}

        <div className={s.constructorControlGroup}>
          <div className={s.sheetSectionHead}>
            <strong>Forma del vano</strong>
            <span>Define el contorno completo de la pieza.</span>
          </div>
          <div className={s.segmentedGrid} role="group" aria-label="Forma del vano">
            {[
              { id: "rect", label: "Recto" },
              { id: "arch_top", label: "Arco" },
              { id: "rounded", label: "Redondeado" },
            ].map((shape) => (
              <button
                key={shape.id}
                type="button"
                className={`${s.segmentBtn} ${
                  config.frameShape.kind === shape.id ? s.segmentBtnActive : ""
                }`}
                onClick={() => setFrameShape(shape.id as "rect" | "arch_top" | "rounded")}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>

        {selectedModule ? (
          <>
            <div className={s.constructorControlGroup}>
              <div className={s.sheetSectionHead}>
                <strong>Forma del vidrio</strong>
                <span>Aplica solo al modulo seleccionado.</span>
              </div>
              <div className={s.segmentedGrid} role="group" aria-label="Forma del vidrio">
                {[
                  { id: "rect", label: "Recto" },
                  { id: "rounded", label: "Redondeado" },
                ].map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    className={`${s.segmentBtn} ${
                      selectedModule.glassShape.kind === shape.id ? s.segmentBtnActive : ""
                    }`}
                    onClick={() => setGlassShape(shape.id as "rect" | "rounded")}
                  >
                    {shape.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.constructorControlGroup}>
              <div className={s.sheetSectionHead}>
                <strong>Palillos</strong>
                <span>Diseno rapido para el modulo seleccionado.</span>
              </div>
              <div className={s.segmentedGrid} role="group" aria-label="Palillos">
                {[
                  { id: "none", label: "Sin" },
                  { id: "v1", label: "Vertical" },
                  { id: "h1", label: "Horizontal" },
                  { id: "cross", label: "Cruz" },
                  { id: "grid2x2", label: "Reticula" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={s.segmentBtn}
                    onClick={() =>
                      setPalillos(preset.id as "none" | "v1" | "h1" | "cross" | "grid2x2")
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className={s.fsFooter}>
        <button
          type="button"
          className={s.primaryBtn}
          onClick={() => onApply(configWithDraftDimensions())}
        >
          Usar esta composicion
        </button>
      </div>
    </div>
  );
}
