"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type CubicationAdjustmentChoiceDialogProps = {
  open: boolean;
  lineName?: string;
  summaryLines?: string[];
  isSaving?: boolean;
  onKeepQuoteOnly: () => void;
  onSaveToLine: () => void;
  onCancel: () => void;
};

/**
 * Tras editar la pauta: el maestro elige si el ajuste queda solo en la cotización
 * o se guarda en la línea del taller (sin aprendizaje silencioso).
 */
export function CubicationAdjustmentChoiceDialog({
  open,
  lineName,
  summaryLines = [],
  isSaving = false,
  onKeepQuoteOnly,
  onSaveToLine,
  onCancel,
}: CubicationAdjustmentChoiceDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Cómo aplicar este ajuste?</DialogTitle>
          <DialogDescription>
            Corregiste la pauta. Elige si es solo para este trabajo o si quieres recordar el
            ajuste en la línea
            {lineName ? ` “${lineName}”` : " del catálogo"} para próximas cotizaciones.
          </DialogDescription>
        </DialogHeader>

        {summaryLines.length > 0 ? (
          <ul className="m-0 max-h-40 list-disc overflow-auto pl-5 text-sm text-slate-600">
            {summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-slate-600">
            Se detectaron cambios en la pauta. Guardar en la línea actualizará perfiles y/o
            descuentos en mm, y si estaba validada pasará a Revisar cambios.
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            variant="default"
            className="w-full"
            disabled={isSaving}
            onClick={onSaveToLine}
          >
            {isSaving ? "Guardando…" : "Guardar como ajuste para esta línea"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSaving}
            onClick={onKeepQuoteOnly}
          >
            Aplicar solo a esta cotización
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={isSaving}
            onClick={onCancel}
          >
            Seguir editando
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
