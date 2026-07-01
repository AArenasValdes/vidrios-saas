"use client";

import { EncabezadoFlujo } from "../encabezado-flujo";
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
  const isStepOneDesktop = step === 1;

  return (
    <div className={`${styles.page} ${rootClassName}`}>
      <EncabezadoFlujo {...headerProps} />

      <div className={`${styles.layout} ${layoutClassName}`}>
        <div className={styles.main}>
          {isStepOneDesktop ? (
            <PasoUnoDatosCliente
              {...stepOneProps}
              summarySlot={<ResumenDesktopLateral {...sideSummaryProps} />}
            />
          ) : null}
          {step === 2 ? (
            <PasoDosSeccion
              {...stepTwoSectionProps}
              addGroupSheetProps={addGroupSheetProps}
            />
          ) : null}
          {step === 3 ? <PasoTresResumen {...stepThreeProps} /> : null}
        </div>
      </div>
    </div>
  );
}
