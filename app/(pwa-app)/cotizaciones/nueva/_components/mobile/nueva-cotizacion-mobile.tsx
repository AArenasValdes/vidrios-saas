"use client";

import { EncabezadoFlujo } from "../encabezado-flujo";
import { PasoDosWizardMovil } from "../paso-dos/paso-dos-wizard-movil";
import { PasoTresResumen } from "../paso-tres-resumen";
import { PasoUnoDatosCliente } from "../paso-uno-datos-cliente";
import type { NuevaCotizacionMobileShellProps } from "../../_types/nueva-cotizacion-shell";
import styles from "./page.mobile.module.css";

export function NuevaCotizacionMobile({
  rootClassName,
  layoutClassName,
  step,
  headerProps,
  stepOneProps,
  stepTwoWizardProps,
  stepThreeProps,
}: NuevaCotizacionMobileShellProps) {
  return (
    <div className={`${styles.page} ${rootClassName}`}>
      <EncabezadoFlujo {...headerProps} />

      <div className={`${styles.layout} ${layoutClassName}`}>
        {step === 1 ? <PasoUnoDatosCliente {...stepOneProps} /> : null}
        {step === 2 ? <PasoDosWizardMovil {...stepTwoWizardProps} /> : null}
        {step === 3 ? <PasoTresResumen {...stepThreeProps} /> : null}
      </div>
    </div>
  );
}
