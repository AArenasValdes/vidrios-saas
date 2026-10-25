"use client";

import { useState } from "react";
import { LuDownload, LuLoaderCircle } from "react-icons/lu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import s from "./glass-sheet-format-dialog.module.css";

export type GlassSheetFormatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (format: { widthMm: number; heightMm: number }) => void;
  isSubmitting?: boolean;
};

export function GlassSheetFormatDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: GlassSheetFormatDialogProps) {
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");

  const parsedWidth = Number(widthMm);
  const parsedHeight = Number(heightMm);
  const isValid =
    Number.isSafeInteger(parsedWidth) &&
    parsedWidth > 0 &&
    Number.isSafeInteger(parsedHeight) &&
    parsedHeight > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    onSubmit({ widthMm: parsedWidth, heightMm: parsedHeight });
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className={s.dialogContent}>
        <DialogHeader className={s.dialogHeader}>
          <DialogTitle className={s.dialogTitle}>Formato de plancha de vidrio</DialogTitle>
          <DialogDescription className={s.dialogDesc}>
            Indica las dimensiones de la plancha para generar el plano de corte.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className={s.formGrid}>
            <div className={s.inputGroup}>
              <label htmlFor="glass-sheet-width" className={s.label}>
                Ancho de plancha (mm)
              </label>
              <input
                id="glass-sheet-width"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="100"
                step="1"
                placeholder="Ej. 2500"
                className={s.input}
                value={widthMm}
                onChange={(e) => setWidthMm(e.target.value)}
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div className={s.inputGroup}>
              <label htmlFor="glass-sheet-height" className={s.label}>
                Alto de plancha (mm)
              </label>
              <input
                id="glass-sheet-height"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="100"
                step="1"
                placeholder="Ej. 1800"
                className={s.input}
                value={heightMm}
                onChange={(e) => setHeightMm(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <p className={s.temporaryNote}>
            Esta medida se usará para esta descarga sin guardarla como configuración permanente.
          </p>

          <div className={s.actions}>
            <button
              type="button"
              className={s.cancelBtn}
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={s.submitBtn}
              disabled={!isValid || isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <LuLoaderCircle className={s.spinner} aria-hidden />
              ) : (
                <LuDownload aria-hidden />
              )}
              {isSubmitting ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
