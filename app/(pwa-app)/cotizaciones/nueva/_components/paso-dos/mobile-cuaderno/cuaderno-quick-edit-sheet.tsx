"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LuArrowRight, LuX } from "react-icons/lu";

import { LineTemplatePicker } from "@/features/cotizaciones/line-templates/components/line-template-picker";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  ALUMINUM_COLOR_OPTIONS,
  applyLineTemplateToComponentForm,
  buildComponentFormLinePricingSummary,
  PVC_COLOR_OPTIONS,
  type ComponentFormState,
  mapItemToForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { GlassOptionPicker } from "@/features/cotizaciones/visual-composer/components/glass-option-picker";
import type { QuoteConstructorItemPatch } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";

import s from "./paso-dos-cuaderno-movil.module.css";

const QUICK_QTY = [1, 2, 4, 6] as const;
const PROFILE_MATERIALS = ["Aluminio", "PVC"] as const;

type ProfileMaterial = Extract<ComponentFormState["material"], (typeof PROFILE_MATERIALS)[number]>;

function normalizeProfileMaterial(material: ComponentFormState["material"]): ProfileMaterial {
  return material === "PVC" ? "PVC" : "Aluminio";
}

function getColorOptionsForMaterial(material: ProfileMaterial) {
  return material === "PVC" ? PVC_COLOR_OPTIONS : ALUMINUM_COLOR_OPTIONS;
}

type Props = {
  item: CotizacionWorkflowItem;
  lineTemplates: CotizacionLineTemplate[];
  glassOptions: readonly string[];
  formatCurrencyInput: (value: string) => string;
  onClose: () => void;
  onSave: (patch: QuoteConstructorItemPatch) => void;
  onOpenConstructor: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function CuadernoQuickEditSheet({
  item,
  lineTemplates,
  glassOptions,
  formatCurrencyInput,
  onClose,
  onSave,
  onOpenConstructor,
  onDuplicate,
  onRemove,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const form = useMemo(() => mapItemToForm(item), [item]);
  const [nombre, setNombre] = useState(item.nombre);
  const [ancho, setAncho] = useState(item.ancho ? String(item.ancho) : "");
  const [alto, setAlto] = useState(item.alto ? String(item.alto) : "");
  const [cantidad, setCantidad] = useState(String(Math.max(1, item.cantidad || 1)));
  const [precioDraft, setPrecioDraft] = useState<string | null>(null);
  const [precioEditedManually, setPrecioEditedManually] = useState(false);
  const [lineTemplateIdDraft, setLineTemplateIdDraft] = useState<string | null>(null);
  const [vidrioDraft, setVidrioDraft] = useState<string | null>(null);
  const [colorHexDraft, setColorHexDraft] = useState<string | null>(null);
  const [materialDraft, setMaterialDraft] = useState<ProfileMaterial>(() =>
    normalizeProfileMaterial(form.material)
  );
  const [showColorChoices, setShowColorChoices] = useState(false);

  const itemPrice = item.precioUnitario > 0 ? String(Math.round(item.precioUnitario)) : "";
  const precio = precioDraft ?? itemPrice;
  const lineTemplateId = lineTemplateIdDraft ?? form.lineTemplateId;
  const vidrio = vidrioDraft ?? form.vidrio;
  const colorHex = colorHexDraft ?? form.colorHex;
  const materialColorOptions = getColorOptionsForMaterial(materialDraft);
  const currentColor =
    materialColorOptions.find((color) => color.hex.toLowerCase() === colorHex.toLowerCase()) ??
    { label: "Color actual", hex: colorHex };
  const colorOptions = materialColorOptions.some(
    (color) => color.hex.toLowerCase() === colorHex.toLowerCase()
  )
    ? materialColorOptions
    : [currentColor, ...materialColorOptions];

  const buildLocalForm = (): ComponentFormState => ({
    ...form,
    nombre,
    ancho,
    alto,
    cantidad: cantidad.trim() || "1",
    lineTemplateId,
    vidrio,
    material: materialDraft,
    colorHex,
    costoProveedorUnitario: precio,
  });

  const getSuggestedPriceForTemplate = (templateId: string) => {
    const template = lineTemplates.find((candidate) => String(candidate.id) === templateId);
    if (!template) return "";

    const pricedForm = applyLineTemplateToComponentForm(buildLocalForm(), template);
    const summary = buildComponentFormLinePricingSummary(pricedForm);
    return summary.precioUnitarioSugerido !== null
      ? String(Math.round(summary.precioUnitarioSugerido))
      : "";
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const syncKeyboardOffset = () => {
      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      panel.style.setProperty("--cq-keyboard-offset", `${keyboardOffset}px`);
    };

    syncKeyboardOffset();
    viewport.addEventListener("resize", syncKeyboardOffset);
    viewport.addEventListener("scroll", syncKeyboardOffset);
    return () => {
      viewport.removeEventListener("resize", syncKeyboardOffset);
      viewport.removeEventListener("scroll", syncKeyboardOffset);
      panel.style.removeProperty("--cq-keyboard-offset");
    };
  }, []);

  const handleSave = () => {
    const patch: QuoteConstructorItemPatch = {
      nombre: nombre.trim().slice(0, 120) || item.nombre,
      ancho: ancho.trim(),
      alto: alto.trim(),
      cantidad: cantidad.trim() || "1",
      lineTemplateId,
      vidrio,
      material: materialDraft,
      colorHex,
    };
    if (precio.trim()) {
      patch.costoProveedorUnitario = precio.trim();
      if (precioEditedManually) {
        patch.markPriceManual = true;
      }
    }
    onSave(patch);
  };

  const handleLineTemplateChange = (nextLineTemplateId: string) => {
    setLineTemplateIdDraft(nextLineTemplateId);
    setPrecioDraft(nextLineTemplateId ? getSuggestedPriceForTemplate(nextLineTemplateId) : "");
    setPrecioEditedManually(false);
  };

  const handleVidrioChange = (nextVidrio: string) => {
    setVidrioDraft(nextVidrio);
  };

  const handleMaterialChange = (nextMaterial: ProfileMaterial) => {
    setMaterialDraft(nextMaterial);
    setShowColorChoices(false);

    const nextColorOptions = getColorOptionsForMaterial(nextMaterial);
    const keepsCurrentColor = nextColorOptions.some(
      (color) => color.hex.toLowerCase() === colorHex.toLowerCase()
    );
    if (!keepsCurrentColor && nextColorOptions[0]) {
      setColorHexDraft(nextColorOptions[0].hex);
    }
    setLineTemplateIdDraft("");
    setPrecioDraft(null);
    setPrecioEditedManually(false);
  };

  const handleColorChange = (nextColorHex: string) => {
    setColorHexDraft(nextColorHex);
  };

  return (
    <div className={s.sheetRoot} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className={s.sheetScrim} aria-label="Cerrar" onClick={onClose} />
      <div ref={panelRef} className={s.sheetPanel}>
        <div className={s.sheetHandle} aria-hidden />
        <div className={s.sheetHeader}>
          <div>
            <h2 id={titleId} className={s.sheetTitle}>
              Editar pieza
            </h2>
            <p className={s.sheetSub}>{item.tipo || "Componente"} - se guarda al confirmar</p>
          </div>
          <button type="button" className={s.iconBtn} aria-label="Cerrar" onClick={onClose}>
            <LuX size={18} />
          </button>
        </div>

        <div className={s.sheetBody}>
          <section className={s.sheetSection} aria-label="Datos basicos">
            <div className={s.sheetSectionHead}>
              <strong>Datos base</strong>
              <span>Medidas y cantidad de esta pieza.</span>
            </div>

            <label className={s.field}>
              <span className={s.fieldLabel}>Nombre</span>
              <input
                className={s.fieldInput}
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                autoComplete="off"
              />
            </label>

            <div className={s.fieldRow}>
              <label className={s.field}>
                <span className={s.fieldLabel}>Ancho</span>
                <input
                  className={s.fieldInput}
                  inputMode="numeric"
                  value={ancho}
                  onChange={(event) => setAncho(event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="mm"
                />
              </label>
              <label className={s.field}>
                <span className={s.fieldLabel}>Alto</span>
                <input
                  className={s.fieldInput}
                  inputMode="numeric"
                  value={alto}
                  onChange={(event) => setAlto(event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="mm"
                />
              </label>
            </div>

            <label className={s.field}>
              <span className={s.fieldLabel}>Cantidad</span>
              <input
                className={s.fieldInput}
                inputMode="numeric"
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value.replace(/[^\d]/g, ""))}
              />
            </label>

            <div className={s.qtyChips} role="group" aria-label="Cantidad rapida">
              {QUICK_QTY.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${s.qtyChip} ${cantidad === String(value) ? s.qtyChipActive : ""}`}
                  onClick={() => setCantidad(String(value))}
                >
                  x{value}
                </button>
              ))}
            </div>
          </section>

          <section className={`${s.sheetSection} ${s.profileSection}`} aria-label="Perfil">
            <div className={s.sheetSectionHead}>
              <strong>Perfil</strong>
              <span>Material y color visible antes de elegir linea.</span>
            </div>
            <div className={s.materialField}>
              <span className={s.fieldLabel}>Material del perfil</span>
              <div className={s.materialToggle} role="group" aria-label="Elegir material del perfil">
                {PROFILE_MATERIALS.map((material) => (
                  <button
                    key={material}
                    type="button"
                    className={`${s.materialOption} ${
                      materialDraft === material ? s.materialOptionActive : ""
                    }`}
                    aria-pressed={materialDraft === material}
                    onClick={() => handleMaterialChange(material)}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.field}>
              <span className={s.fieldLabel}>Color del perfil</span>
              <div className={s.colorSummary}>
                <div className={s.colorSelected}>
                  <span
                    className={s.colorSwatchDot}
                    style={{ backgroundColor: currentColor.hex }}
                    aria-hidden
                  />
                  <span>{currentColor.label}</span>
                </div>
                <button
                  type="button"
                  className={s.colorChangeBtn}
                  onClick={() => setShowColorChoices((value) => !value)}
                >
                  {showColorChoices ? "Ocultar" : "Cambiar"}
                </button>
              </div>
              {showColorChoices ? (
                <div className={s.colorGrid} role="group" aria-label="Colores principales">
                  {colorOptions.map((color) => {
                    const active = color.hex.toLowerCase() === colorHex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        className={`${s.colorSwatch} ${active ? s.colorSwatchActive : ""}`}
                        aria-label={color.label}
                        aria-pressed={active}
                        onClick={() => {
                          handleColorChange(color.hex);
                          setShowColorChoices(false);
                        }}
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
              ) : null}
            </div>
          </section>

          <section className={s.sheetSection} aria-label="Linea y precio">
            <div className={s.sheetSectionHead}>
              <strong>Linea y precio</strong>
              <span>Al elegir linea se recalcula con la plantilla configurada.</span>
            </div>
            <div className={s.compactPicker}>
              <LineTemplatePicker
                templates={lineTemplates}
                value={lineTemplateId}
                onChange={handleLineTemplateChange}
                mode="profile"
                preferredMaterial={materialDraft}
                ariaLabel="Elegir linea de esta pieza"
              />
            </div>

            <label className={s.field}>
              <span className={s.fieldLabel}>Precio unitario</span>
              <input
                className={s.fieldInput}
                inputMode="numeric"
                value={precio ? formatCurrencyInput(precio) : ""}
                onChange={(event) => {
                  setPrecioDraft(event.target.value.replace(/[^\d]/g, ""));
                  setPrecioEditedManually(true);
                }}
                placeholder="CLP"
              />
            </label>

            <div className={s.technicalNote}>
              <strong>Cubicacion y pauta de corte</strong>
              <span>Se revisa en desktop con la linea elegida. En movil queda como dato rapido.</span>
            </div>
          </section>

          <section className={s.sheetSection} aria-label="Vidrio">
            <div className={s.sheetSectionHead}>
              <strong>Vidrio</strong>
              <span>Tipo de vidrio para esta pieza.</span>
            </div>
            <div className={s.compactPicker}>
              <GlassOptionPicker
                options={glassOptions}
                value={vidrio}
                onChange={handleVidrioChange}
                ariaLabel="Elegir tipo de vidrio"
                placeholder="Elegir vidrio"
              />
            </div>
          </section>

          <button type="button" className={s.constructorLink} onClick={onOpenConstructor}>
            <span>
              <p className={s.constructorLinkTitle}>Forma y apertura</p>
              <p className={s.constructorLinkHelp}>
                Parte modulos, cambia apertura, redondeos y palillos.
              </p>
            </span>
            <LuArrowRight size={18} aria-hidden />
          </button>

          <div className={s.sheetActions}>
            <button type="button" className={s.secondaryBtn} onClick={onDuplicate}>
              Duplicar
            </button>
            <button type="button" className={s.dangerBtn} onClick={onRemove}>
              Eliminar
            </button>
          </div>
        </div>

        <div className={s.sheetFooter}>
          <button type="button" className={s.primaryBtn} onClick={handleSave}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
