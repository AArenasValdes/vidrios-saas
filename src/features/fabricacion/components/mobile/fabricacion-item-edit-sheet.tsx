"use client";

import { RecipeGlassNamePicker } from "@/features/fabricacion/components/recipe-glass-name-picker";
import { patchRecipeGlassNombre } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import {
  describeAccesorioReglaHumana,
  describeRecipeGlassListRow,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-mobile.module.css";
import { useMobileSheetChrome } from "./use-mobile-sheet-chrome";

type SheetKind = "glass" | "accessory";

type Props = {
  recipe: FabricacionReceta;
  kind: SheetKind;
  itemId: string;
  readOnly?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onRecipeChange: (recipe: FabricacionReceta) => void;
  onPersist: (recipe: FabricacionReceta) => Promise<void>;
};

function positiveNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function FabricacionItemEditSheet({
  recipe,
  kind,
  itemId,
  readOnly = false,
  isSaving = false,
  onClose,
  onRecipeChange,
  onPersist,
}: Props) {
  useMobileSheetChrome(onClose);

  const glass = kind === "glass" ? recipe.vidrios.find((entry) => entry.id === itemId) : null;
  const accessory =
    kind === "accessory" ? recipe.accesorios.find((entry) => entry.id === itemId) : null;

  if (!glass && !accessory) return null;

  const glassDisplay = glass ? describeRecipeGlassListRow(glass) : null;
  const title = glassDisplay
    ? glassDisplay.title
    : accessory?.nombre.trim() || "Accesorio";
  const sheetSubtitle = glassDisplay
    ? glassDisplay.typePending
      ? "Elige el vidrio habitual de esta línea. También puedes definirlo al cotizar cada pieza."
      : "Vidrio de la receta"
    : "Accesorio de cubicación";

  const handleSave = async () => {
    await onPersist(recipe);
    onClose();
  };

  return (
    <div className={s.sheetBackdrop} role="presentation" onClick={onClose}>
      <section
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fabricacion-item-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={s.sheetHeader}>
          <button type="button" className={s.textButton} onClick={onClose}>
            Cancelar
          </button>
          <div>
            <h2 id="fabricacion-item-sheet-title">{title}</h2>
            <p>{sheetSubtitle}</p>
          </div>
          <button
            type="button"
            className={s.sheetPrimaryAction}
            disabled={readOnly || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
        </header>

        {glass ? (
          <div className={s.sheetSection}>
            <RecipeGlassNamePicker
              value={glass.nombre}
              readOnly={readOnly}
              onChange={(nextName) =>
                onRecipeChange(patchRecipeGlassNombre(recipe, glass.id, nextName))
              }
            />
          </div>
        ) : null}

        {accessory ? (
          <div className={s.sheetSection}>
            <label>
              <span>Nombre</span>
              <input
                value={accessory.nombre}
                disabled={readOnly}
                autoComplete="off"
                onChange={(event) =>
                  onRecipeChange({
                    ...recipe,
                    accesorios: recipe.accesorios.map((entry) =>
                      entry.id === accessory.id
                        ? { ...entry, nombre: event.target.value }
                        : entry
                    ),
                  })
                }
              />
            </label>
            <label>
              <span>Cantidad</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={accessory.reglaCantidad.cantidad}
                disabled={readOnly}
                onChange={(event) =>
                  onRecipeChange({
                    ...recipe,
                    accesorios: recipe.accesorios.map((entry) =>
                      entry.id === accessory.id
                        ? {
                            ...entry,
                            reglaCantidad: {
                              ...entry.reglaCantidad,
                              cantidad: positiveNumber(event.target.value),
                            },
                          }
                        : entry
                    ),
                  })
                }
              />
            </label>
            <p className={s.hint}>{describeAccesorioReglaHumana(accessory)}</p>
          </div>
        ) : null}

        <footer className={s.sheetFooter}>
          <button
            type="button"
            className={s.primaryButton}
            disabled={readOnly || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </section>
    </div>
  );
}
