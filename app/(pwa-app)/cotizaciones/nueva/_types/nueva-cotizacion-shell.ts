import type { ComponentProps } from "react";

import type { PasoDosAgregarGrupoSheet } from "../_components/paso-dos/paso-dos-agregar-grupo-sheet";
import type { PasoDosSeccion } from "../_components/paso-dos-seccion";
import type { PasoDosWizardMovil } from "../_components/paso-dos/paso-dos-wizard-movil";
import type { EncabezadoFlujo } from "../_components/encabezado-flujo";
import type { PasoTresResumen } from "../_components/paso-tres-resumen";
import type { PasoUnoDatosCliente } from "../_components/paso-uno-datos-cliente";
import type { ResumenDesktopLateral } from "../_components/resumen-desktop-lateral";

export type EncabezadoFlujoProps = ComponentProps<typeof EncabezadoFlujo>;
export type PasoUnoDatosClienteProps = ComponentProps<typeof PasoUnoDatosCliente>;
export type PasoDosWizardMovilProps = ComponentProps<typeof PasoDosWizardMovil>;
export type PasoDosSeccionProps = ComponentProps<typeof PasoDosSeccion>;
export type PasoTresResumenProps = ComponentProps<typeof PasoTresResumen>;
export type ResumenDesktopLateralProps = ComponentProps<typeof ResumenDesktopLateral>;
export type PasoDosAgregarGrupoSheetProps = ComponentProps<typeof PasoDosAgregarGrupoSheet>;

export type NuevaCotizacionMobileShellProps = {
  rootClassName: string;
  layoutClassName: string;
  step: 1 | 2 | 3;
  headerProps: EncabezadoFlujoProps;
  stepOneProps: PasoUnoDatosClienteProps;
  stepTwoWizardProps: PasoDosWizardMovilProps;
  stepThreeProps: PasoTresResumenProps;
};

export type NuevaCotizacionDesktopShellProps = {
  rootClassName: string;
  layoutClassName: string;
  step: 1 | 2 | 3;
  headerProps: EncabezadoFlujoProps;
  stepOneProps: PasoUnoDatosClienteProps;
  stepTwoSectionProps: PasoDosSeccionProps;
  stepThreeProps: PasoTresResumenProps;
  sideSummaryProps: ResumenDesktopLateralProps;
  addGroupSheetProps: PasoDosAgregarGrupoSheetProps;
};
