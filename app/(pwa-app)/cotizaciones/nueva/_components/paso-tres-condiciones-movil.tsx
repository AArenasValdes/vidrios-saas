"use client";

import { useState } from "react";
import { LuChevronDown, LuFileText } from "react-icons/lu";

import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { OrganizationProfile } from "@/features/organization-profile/types/organization-profile";
import { quoteUsesOrganizationCommercialDefaults } from "@/features/cotizaciones/services/quote-commercial-conditions.service";

import s from "../page.module.css";

type PasoTresCondicionesMovilProps = {
  draft: CotizacionWorkflowDraft;
  organizationProfile?: OrganizationProfile | null;
  onCondicionesDePagoChange: (value: string) => void;
  onCondicionesVentaChange: (value: string) => void;
  onTerminosCondicionesChange: (value: string) => void;
};

export function PasoTresCondicionesMovil({
  draft,
  organizationProfile,
  onCondicionesDePagoChange,
  onCondicionesVentaChange,
  onTerminosCondicionesChange,
}: PasoTresCondicionesMovilProps) {
  const [isOpen, setIsOpen] = useState(false);
  const usesDefaults = quoteUsesOrganizationCommercialDefaults(
    draft,
    organizationProfile
  );

  return (
    <div className={s.stepThreeAdjustmentItem}>
      <button
        type="button"
        className={s.stepThreeAdjustmentRow}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="Condiciones de la cotización"
      >
        <span className={s.stepThreeFreightIcon}>
          <LuFileText aria-hidden />
        </span>
        <span className={s.stepThreeFreightText}>
          <strong>Condiciones de la cotización</strong>
          <span className={s.stepThreeCostosSummary}>
            {usesDefaults
              ? "Predeterminadas de tu empresa ✓"
              : "Personalizadas para esta cotización"}
          </span>
        </span>
        <LuChevronDown className={isOpen ? s.stepThreeFreightToggleOpen : ""} aria-hidden />
      </button>

      {isOpen ? (
        <div className={s.stepThreeCondicionesPanel}>
          <p className={s.stepThreeCondicionesHint}>
            Si no modificas nada, se usan las condiciones de tu empresa. Los cambios
            aplican solo a esta cotización.
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
      ) : null}
    </div>
  );
}
