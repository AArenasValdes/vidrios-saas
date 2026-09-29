"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuX } from "react-icons/lu";
import { ComponentPreview } from "@/features/cotizaciones/components/component-preview";
import { MeasureDimensionInput } from "@/features/cotizaciones/components/measure-dimension-input";
import { useOrganizationMeasureUnit } from "@/features/organization-profile/hooks/use-organization-measure-unit";
import { measureDimensionPlaceholder } from "@/features/organization-profile/services/measure-unit.service";
import { createEmptyQuickCompositionAdjustment, hasQuickCompositionChanges, hasQuickCompositionStructuralChanges, type QuickCompositionAdjustment, type QuickFixedSide, type QuickPalilloPreset, type QuickPaneType } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import { buildQuickCompositionBaseConfig, equalizeQuickLeafWidths, quickCompositionEquals, resolveQuickCompositionCapabilities, setQuickFixedDimension, setQuickLeafWidths, setQuickPaneCount, setQuickPaneDecoration, setQuickPaneType, type QuickCompositionSelection } from "@/features/cotizaciones/visual-composer/services/quick-composition-adjustment.service";
import { getSheetVariantOptions } from "@/features/cotizaciones/new-quote/workflow-ui";
import { useMobileViewportStability } from "../../_hooks/use-mobile-viewport-stability";
import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import s from "./ajuste-composicion-movil.module.css";

type Tool = "distribution" | "fixed" | "palillos" | "invert";
type Props = { draft: PasoDosGrupoDraft; onApply: (adjustment: QuickCompositionAdjustment | null, composition?: { sheetScheme: string; sheetVariant: string }) => void; onClose: () => void };
const SIDE_LABELS: Record<QuickFixedSide, string> = { top: "Superior", bottom: "Inferior", left: "Izquierdo", right: "Derecho" };
const PRESETS: Array<{ id: QuickPalilloPreset; label: string }> = [{ id: "none", label: "Sin" }, { id: "vertical", label: "Vertical" }, { id: "horizontal", label: "Horizontal" }, { id: "cross", label: "Cruz" }, { id: "grid", label: "Retícula" }];
const PANE_TYPES: Array<{ id: QuickPaneType | null; label: string }> = [{ id: null, label: "Según sistema" }, { id: "fixed", label: "Fija" }, { id: "sliding", label: "Corredera" }, { id: "casement", label: "Abatible" }, { id: "projecting", label: "Proyectante" }];

export function AjusteComposicionMovil({ draft, onApply, onClose }: Props) {
  const unit = useOrganizationMeasureUnit();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const scrollYRef = useRef(0);
  const selection: QuickCompositionSelection = useMemo(() => ({ tipo: draft.subtipo, sistema: draft.sistema, configuracion: draft.configuracion, sheetScheme: draft.sheetScheme, sheetVariant: draft.sheetVariant, ancho: Number(draft.ancho), alto: Number(draft.alto), hojasBase: draft.hojasBase, mirrorPaneCount: draft.mirrorPaneCount, existing: draft.quickCompositionAdjustment }), [draft.ancho, draft.alto, draft.configuracion, draft.hojasBase, draft.mirrorPaneCount, draft.quickCompositionAdjustment, draft.sheetScheme, draft.sheetVariant, draft.sistema, draft.subtipo]);
  const base = useMemo(() => buildQuickCompositionBaseConfig(selection), [selection]);
  const original = draft.quickCompositionAdjustment ?? createEmptyQuickCompositionAdjustment();
  const [adjustment, setAdjustment] = useState<QuickCompositionAdjustment>(original);
  const [tool, setTool] = useState<Tool>("distribution");
  const [selectedLeaf, setSelectedLeaf] = useState(0);
  const [error, setError] = useState("");
  const [fixedSide, setFixedSide] = useState<QuickFixedSide>("top");
  const [fixedDraft, setFixedDraft] = useState("");
  const [leafDraft, setLeafDraft] = useState<string[]>([]);
  const [sheetScheme, setSheetScheme] = useState(draft.sheetScheme);
  const [sheetVariant, setSheetVariant] = useState(draft.sheetVariant);
  const [panelKey, setPanelKey] = useState(0);
  useMobileViewportStability({ active: true });

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scrollYRef.current = window.scrollY;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); window.scrollTo({ top: scrollYRef.current, behavior: "auto" }); window.requestAnimationFrame(() => returnFocusRef.current?.focus()); };
  }, [onClose]);

  if (!base.supported) return null;
  const leafCount = resolveQuickCompositionCapabilities({ ...selection, sheetScheme, sheetVariant, existing: adjustment }).leafCount || base.leafCount;
  const width = Number(draft.ancho);
  const height = Number(draft.alto);
  const availableWidth = width - (adjustment.fixedLeftMm ?? 0) - (adjustment.fixedRightMm ?? 0);
  const availableHeight = height - (adjustment.fixedTopMm ?? 0) - (adjustment.fixedBottomMm ?? 0);
  const widths = adjustment.leafWidths?.length === leafCount ? adjustment.leafWidths : equalizeQuickLeafWidths(leafCount, availableWidth);
  const compositionChanged = sheetScheme !== draft.sheetScheme || sheetVariant !== draft.sheetVariant;
  const changed = compositionChanged || !quickCompositionEquals(hasQuickCompositionChanges(adjustment) ? adjustment : null, draft.quickCompositionAdjustment);
  const labels = draft.subtipo === "Ventana"
    ? leafCount === 2 ? ["Hoja izquierda", "Hoja derecha"] : leafCount === 3 ? ["Hoja izquierda", "Hoja central", "Hoja derecha"] : leafCount === 4 ? ["Hoja izquierda", "Hoja centro izquierda", "Hoja centro derecha", "Hoja derecha"] : Array.from({ length: leafCount }, (_, index) => `Hoja ${index + 1}`)
    : Array.from({ length: leafCount }, (_, index) => `Hoja ${index + 1}`);
  const fixedValue = (side: QuickFixedSide) => adjustment[`fixed${side[0].toUpperCase()}${side.slice(1)}Mm` as "fixedTopMm" | "fixedBottomMm" | "fixedLeftMm" | "fixedRightMm"];
  const capabilities = resolveQuickCompositionCapabilities({ ...selection, sheetScheme, sheetVariant, existing: adjustment });
  const availableFixedSides = capabilities.fixedSides;
  const canInvert = capabilities.invert;
  const sheetSchemes = capabilities.sheetSchemes;
  const showGenericPaneCount = sheetSchemes.length <= 1;
  const fixedModuleCount = sidesMap.filter((side) => typeof fixedValue(side) === "number").length;
  const variantOptions = getSheetVariantOptions(sheetScheme, { tipo: draft.subtipo, sistema: draft.sistema });
  const hasUnresolvedChangedVariant = Boolean(
    compositionChanged &&
      variantOptions.length > 0 &&
      (!sheetVariant || !variantOptions.includes(sheetVariant))
  );
  const canApply = changed && !hasUnresolvedChangedVariant;
  const setFixed = (side: QuickFixedSide, raw: string | null) => {
    if (raw !== null && !fixedValue(side) && !availableFixedSides.includes(side)) { setError("Máximo de seis hojas en total."); return; }
    const total = side === "left" || side === "right" ? width : height;
    const parsed = raw === null ? null : Number(raw.replace(/[^\d]/g, ""));
    const next = setQuickFixedDimension(adjustment, side, parsed, total);
    if (!next) { setError("Deja al menos 30 cm para la composición principal."); return; }
    if ((side === "left" || side === "right") && adjustment.leafWidths?.length === leafCount) {
      const nextAvailable = width - (next.fixedLeftMm ?? 0) - (next.fixedRightMm ?? 0);
      const totalBefore = adjustment.leafWidths.reduce((sum, value) => sum + value, 0);
      let used = 0;
      next.leafWidths = adjustment.leafWidths.map((value, index) => {
        if (index === adjustment.leafWidths!.length - 1) return nextAvailable - used;
        const scaled = Math.round(nextAvailable * value / totalBefore); used += scaled; return scaled;
      });
    }
    setAdjustment(next); setLeafDraft([]); setError("");
  };
  const applyWidths = (values: number[]) => {
    const next = setQuickLeafWidths(adjustment, values, availableWidth);
    if (!next) { setError("Las hojas deben sumar el ancho disponible y medir al menos 20 cm."); return; }
    setAdjustment(next); setError(""); setLeafDraft([]);
  };
  const presetWidths = (percentages: number[]) => {
    let used = 0;
    const values = percentages.map((percentage, index) => {
      if (index === percentages.length - 1) return availableWidth - used;
      const value = Math.round(availableWidth * percentage); used += value; return value;
    });
    applyWidths(values);
  };
  const selectedPreset = adjustment.paneDecorations[`leaf-${selectedLeaf + 1}`] ?? "none";
  const closeApply = () => { if (!canApply) return; onApply(hasQuickCompositionChanges(adjustment) ? adjustment : null, compositionChanged ? { sheetScheme, sheetVariant } : undefined); onClose(); };
  const resetDesign = () => { setAdjustment(createEmptyQuickCompositionAdjustment()); setLeafDraft([]); setFixedDraft(""); setError(""); setSheetScheme(draft.sheetScheme); setSheetVariant(draft.sheetVariant); };
  const selectScheme = (value: string) => {
    const nextVariants = getSheetVariantOptions(value, { tipo: draft.subtipo, sistema: draft.sistema });
    const nextVariant = nextVariants.includes(sheetVariant) ? sheetVariant : "";
    setSheetScheme(value); setSheetVariant(nextVariant); setLeafDraft([]); setSelectedLeaf(0); setError("");
    setAdjustment((current) => ({
      ...current,
      leafWidths: null,
      paneCount: null,
      paneDecorations: Object.fromEntries(
        Object.entries(current.paneDecorations).filter(([key]) =>
          Number(key.replace("leaf-", "")) <= Number(value.match(/\d/)?.[0] ?? 0)
        )
      ),
      paneTypes: Object.fromEntries(Object.entries(current.paneTypes ?? {}).filter(([key]) =>
        Number(key.replace("leaf-", "")) <= Number(value.match(/\d/)?.[0] ?? 0)
      )),
    }));
  };

  return <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="quick-composition-title">
    <header className={s.header}><button ref={closeRef} className={s.close} type="button" onClick={onClose} aria-label="Cerrar Ajustar composición"><LuX aria-hidden="true" /></button><h1 id="quick-composition-title">Ajustar composición</h1><span aria-hidden="true" /></header>
    <main className={s.content}>
      <div className={s.preview} aria-label="Croquis comercial con ajustes"><ComponentPreview type={draft.subtipo} system={draft.sistema} configuration={draft.configuracion} width={width} height={height} colorHex={draft.colorHex} material={draft.material} sheetScheme={sheetScheme} sheetVariant={sheetVariant} presentation={draft.subtipo === "Ventana" && draft.sistema === "Corredera" && sheetScheme === "3 hojas" && sheetVariant === "2 móviles + 1 fija" ? "mobile-guided" : undefined} customSchemeDescription={draft.customSchemeDescription} isCustomScheme={draft.isCustomScheme} hojasBase={draft.hojasBase} referencia={draft.referencia} guidedVisualConfig={draft.guidedVisualConfig} quickCompositionAdjustment={hasQuickCompositionChanges(adjustment) ? adjustment : null} quickSelectedPaneIndex={selectedLeaf} maxW={430} maxH={270} size="hero" /><div className={s.paneHotspots} style={{ gridTemplateColumns: widths.map((value) => `${value}fr`).join(" "), left: `${12 + (adjustment.fixedLeftMm ?? 0) / width * 100}%`, right: `${12 + (adjustment.fixedRightMm ?? 0) / width * 100}%`, top: `${17 + (adjustment.fixedTopMm ?? 0) / height * 100}%`, bottom: `${17 + (adjustment.fixedBottomMm ?? 0) / height * 100}%` }} aria-label="Seleccionar hoja en el croquis">{labels.map((label, index) => <button type="button" key={label} aria-label={`Editar ${label.toLowerCase()}`} aria-pressed={selectedLeaf === index} onClick={() => setSelectedLeaf(index)} />)}</div></div>
      <nav className={canInvert ? s.toolsFour : s.tools} aria-label="Herramientas de composición">{(["distribution", "fixed", ...(capabilities.palillos ? ["palillos" as const] : []), ...(canInvert ? ["invert" as const] : [])] as const).map((key) => <button key={key} type="button" aria-pressed={tool === key} onClick={() => { setTool(key); setPanelKey((value) => value + 1); }}>{key === "distribution" ? "Distribución" : key === "fixed" ? "+ Fijo" : key === "palillos" ? "Palillos" : "Invertir"}</button>)}</nav>
      {tool === "distribution" ? <section key={panelKey} className={`${s.section} ${s.panel}`} aria-label="Distribución de hojas">
        {sheetSchemes.length > 1 ? <><h2>Composición</h2><div className={s.schemeGrid}>{sheetSchemes.map((option) => <button type="button" key={option.value} className={sheetScheme === option.value ? s.activeScheme : ""} aria-pressed={sheetScheme === option.value} onClick={() => selectScheme(option.value)}><span className={s.schemeDrawing} aria-hidden="true">{Array.from({ length: option.leafCount }, (_, index) => <i key={index} />)}</span><span>{option.leafCount} hojas</span>{sheetScheme === option.value ? <LuCheck aria-hidden="true" /> : null}</button>)}</div>{variantOptions.length > 0 ? <><h3>Variante</h3><div className={s.chips}>{variantOptions.map((variant) => <button key={variant} className={sheetVariant === variant ? s.activeChip : s.chip} type="button" aria-pressed={sheetVariant === variant} onClick={() => setSheetVariant(variant)}>{variant}</button>)}</div></> : null}</> : null}
        {showGenericPaneCount ? <><h2>División del croquis</h2><div className={s.chips}>{Array.from({ length: Math.max(1, 6 - fixedModuleCount) }, (_, index) => index + 1).map((count) => <button key={count} type="button" aria-pressed={leafCount === count} className={leafCount === count ? s.activeChip : s.chip} disabled={count > 1 && availableWidth / count < 200} onClick={() => { const next = setQuickPaneCount(adjustment, count, availableWidth); if (!next) { setError("Cada hoja debe medir al menos 20 cm."); return; } setAdjustment(next); setLeafDraft([]); setSelectedLeaf(0); setError(""); }}>{count} {count === 1 ? "hoja" : "hojas"}</button>)}</div></> : null}
        <h2>Tipo de {labels[selectedLeaf]?.toLowerCase() ?? "hoja"}</h2><div className={s.paneTypeChoices} role="group" aria-label={`Tipo de ${labels[selectedLeaf]?.toLowerCase() ?? "hoja"}`}>{PANE_TYPES.map((option) => { const selectedType = adjustment.paneTypes?.[`leaf-${selectedLeaf + 1}`] ?? null; return <button key={option.label} type="button" aria-pressed={selectedType === option.id} className={selectedType === option.id ? s.activeChip : s.chip} onClick={() => { setAdjustment((current) => setQuickPaneType(current, selectedLeaf, option.id)); setError(""); }}>{option.label}</button>; })}</div>
        <h2>Distribución de hojas</h2>
        {leafCount > 1 ? Array.from({ length: leafCount }, (_, index) => <label className={s.measureLabel} key={index}><span>{labels[index]}</span><div className={s.measureControl}><MeasureDimensionInput className={s.measureInput} aria-label={`${labels[index]}, ${unit}`} valueMm={leafDraft[index] ?? String(widths[index])} onChangeMm={(raw) => setLeafDraft((current) => { const next = current.length === leafCount ? [...current] : widths.map(String); next[index] = raw; return next; })} onBlurMm={(raw) => { const values = leafDraft.length === leafCount ? leafDraft.map(Number) : widths.slice(); values[index] = Number(raw.replace(/[^\d]/g, "")); applyWidths(values); }} unit={unit} placeholder={measureDimensionPlaceholder("ancho", unit)} /><span className={s.measureUnit}>{unit}</span></div></label>) : <p className={s.hint}>El croquis completo está como una hoja. Puedes dividirlo o agregar paños fijos desde las otras herramientas.</p>}
        {leafCount > 1 ? <><div className={s.chips}>{(leafCount === 2 ? [[0.5, 0.5], [0.4, 0.6], [0.6, 0.4]] : leafCount === 3 ? [[1 / 3, 1 / 3, 1 / 3], [0.25, 0.5, 0.25]] : []).map((preset, index) => <button key={index} className={s.chip} type="button" onClick={() => presetWidths(preset)}>{leafCount === 2 ? ["50/50", "40/60", "60/40"][index] : ["Iguales", "25/50/25"][index]}</button>)}</div><button className={s.equalize} type="button" onClick={() => applyWidths(equalizeQuickLeafWidths(leafCount, availableWidth))}>= Igualar hojas</button></> : null}
      </section> : null}
      {tool === "fixed" ? <section key={panelKey} className={`${s.section} ${s.panel}`} aria-label="Fijos periféricos"><p className={s.sectionIntro}>Toca un lado para agregar o quitar un fijo.</p><div className={s.fixedGrid}>{sidesMap.map((side) => { const active = typeof fixedValue(side) === "number"; const unavailable = !active && !availableFixedSides.includes(side); return <button className={active ? s.fixedActive : ""} type="button" key={side} aria-pressed={active} disabled={unavailable} title={unavailable ? "Máximo de seis hojas" : undefined} onClick={() => { setFixedSide(side); if (active) { setFixed(side, null); setFixedDraft(""); } else { const total = side === "left" || side === "right" ? width : height; const initial = Math.max(150, Math.min(total - 300, Math.round(total * 0.2))); setFixedDraft(String(initial)); setFixed(side, String(initial)); } }}>{active ? <><LuCheck aria-hidden="true" /> {SIDE_LABELS[side]}</> : SIDE_LABELS[side]}</button>; })}</div><div className={s.activeFixedList}>{sidesMap.filter((side) => typeof fixedValue(side) === "number").map((side) => <label className={s.fixedRow} key={side}><span>Fijo {SIDE_LABELS[side].toLowerCase()}</span><div className={s.measureControl}><MeasureDimensionInput className={s.measureInput} aria-label={`Medida fijo ${SIDE_LABELS[side].toLowerCase()}, ${unit}`} valueMm={fixedDraft && fixedSide === side ? fixedDraft : String(fixedValue(side))} onChangeMm={(raw) => { setFixedSide(side); setFixedDraft(raw); }} onBlurMm={(raw) => setFixed(side, raw)} unit={unit} placeholder={measureDimensionPlaceholder(side === "left" || side === "right" ? "ancho" : "alto", unit)} /><span className={s.measureUnit}>{unit}</span></div><button type="button" aria-label={`Quitar fijo ${SIDE_LABELS[side].toLowerCase()}`} onClick={() => { setFixed(side, null); if (fixedSide === side) setFixedDraft(""); }}>×</button></label>)}</div>{error ? <p className={s.error} role="alert">{error}</p> : <p className={s.hint}>Espacio disponible: {unit === "cm" ? `${(availableWidth / 10).toFixed(1)} × ${(availableHeight / 10).toFixed(1)} cm` : `${availableWidth} × ${availableHeight} mm`}</p>}</section> : null}
      {tool === "palillos" ? <section key={panelKey} className={`${s.section} ${s.panel}`} aria-label="Palillos por hoja"><h2>Aplicar palillos a</h2><div className={s.paneChoices}>{labels.map((label, index) => <button className={selectedLeaf === index ? s.selectedPane : ""} key={label} type="button" aria-pressed={selectedLeaf === index} onClick={() => setSelectedLeaf(index)}>{selectedLeaf === index ? <LuCheck aria-hidden="true" /> : null}{label}</button>)}</div><h2 className={s.designTitle}>Diseño</h2><div className={s.chips}>{PRESETS.map((preset) => <button key={preset.id} type="button" aria-pressed={selectedPreset === preset.id} className={selectedPreset === preset.id ? s.activeChip : s.chip} onClick={() => setAdjustment((current) => setQuickPaneDecoration(current, selectedLeaf, preset.id))}>{selectedPreset === preset.id ? "✓ " : ""}{preset.label}</button>)}</div><p className={s.hint}>Se muestran en el croquis; la pauta actual no calcula sus cortes.</p></section> : null}
      {tool === "invert" && canInvert ? <section key={panelKey} className={`${s.section} ${s.panel}`}><p>Invierte la apertura y los fijos laterales sin cambiar las medidas exteriores.</p><button className={s.equalize} type="button" aria-pressed={adjustment.mirrored} onClick={() => setAdjustment((current) => ({ ...current, mirrored: !current.mirrored }))}>{adjustment.mirrored ? "Restaurar orientación" : "Invertir apertura"}</button></section> : null}
      <button type="button" className={s.reset} onClick={resetDesign}>Restablecer diseño original</button>
    </main><footer className={s.footer}>{hasQuickCompositionStructuralChanges(adjustment) ? <p className={s.fabricationNotice} role="status">La composición cambió. La pauta automática queda pendiente hasta tener una receta compatible.</p> : null}<button type="button" className={s.apply} onClick={closeApply} disabled={!canApply}>Aplicar cambios</button></footer>
  </div>;
}

const sidesMap: QuickFixedSide[] = ["top", "left", "right", "bottom"];
