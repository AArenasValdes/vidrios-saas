"use client";

import { EncabezadoFlujo } from "../encabezado-flujo";
import { PasoDosAgregarGrupoSheet } from "../paso-dos/paso-dos-agregar-grupo-sheet";
import { PasoDosSeccion } from "../paso-dos-seccion";
import { PasoTresResumen } from "../paso-tres-resumen";
import { PasoUnoDatosCliente } from "../paso-uno-datos-cliente";
import { ResumenDesktopLateral } from "../resumen-desktop-lateral";
import type { NuevaCotizacionDesktopShellProps } from "../../_types/nueva-cotizacion-shell";
import styles from "./page.desktop.module.css";

export function NuevaCotizacionDesktop({
  rootClassName,
  layoutClassName,
  step,
  headerProps,
  stepOneProps,
  stepTwoSectionProps,
  stepThreeProps,
  sideSummaryProps,
  addGroupSheetProps,
}: NuevaCotizacionDesktopShellProps) {
  return (
    <div className={`${styles.page} ${rootClassName}`}>
      <EncabezadoFlujo {...headerProps} />

      <div className={`${styles.layout} ${layoutClassName}`}>
        <div className={styles.main}>
          {step === 1 ? <PasoUnoDatosCliente {...stepOneProps} /> : null}
          {step === 2 ? <PasoDosSeccion {...stepTwoSectionProps} /> : null}
          {step === 3 ? <PasoTresResumen {...stepThreeProps} /> : null}
        </div>

        {step !== 2 && step !== 3 ? (
          <div className={styles.side}>
            <ResumenDesktopLateral {...sideSummaryProps} />
          </div>
        ) : null}
      </div>

      {step === 2 ? <PasoDosAgregarGrupoSheet {...addGroupSheetProps} /> : null}
    </div>
  );
}
