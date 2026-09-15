"use client";

import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

import s from "../page.module.css";

type PasoTresCondicionesMovilProps = {
  draft: CotizacionWorkflowDraft;
  onCondicionesDePagoChange: (value: string) => void;
  onCondicionesVentaChange: (value: string) => void;
  onTerminosCondicionesChange: (value: string) => void;
};

export function PasoTresCondicionesMovil({
  draft,
  onCondicionesDePagoChange,
  onCondicionesVentaChange,
  onTerminosCondicionesChange,
}: PasoTresCondicionesMovilProps) {
  return (
    <details className={s.stepThreeDetailsSecondary}>
      <summary className={`${s.mobileMoreButton} ${s.advancedSummaryButton}`}>
        Editar detalles
      </summary>

      <div className={s.stepThreeCondicionesPanel}>
        <p className={s.stepThreeCondicionesHint}>
          Si no modificas nada, se usan las condiciones predeterminadas de tu empresa. Los
          cambios aplican solo a esta cotización.
        </p>

        <label className={s.stepThreeCondicionesField}>
          <span>Forma de pago</span>
          <textarea
            rows={3}
            value={draft.condicionesDePago ?? ""}
            onChange={(event) => onCondicionesDePagoChange(event.target.value)}
            placeholder="Ej: 50% anticipo, 50% contra entrega"
          />
        </label>

        <label className={s.stepThreeCondicionesField}>
          <span>Condiciones de venta</span>
          <textarea
            rows={5}
            value={draft.condicionesVenta ?? ""}
            onChange={(event) => onCondicionesVentaChange(event.target.value)}
            placeholder="Plazos, garantías, exclusiones, etc."
          />
        </label>

        <label className={s.stepThreeCondicionesField}>
          <span>Términos y condiciones adicionales</span>
          <textarea
            rows={5}
            value={draft.terminosCondiciones ?? ""}
            onChange={(event) => onTerminosCondicionesChange(event.target.value)}
            placeholder="Cláusulas legales o comerciales adicionales"
          />
        </label>
      </div>
    </details>
  );
}
