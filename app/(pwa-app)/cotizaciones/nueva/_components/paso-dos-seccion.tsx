"use client";

import type {
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
} from "../_types/paso-dos";

import { PasoDosFormularioComponente } from "./paso-dos-formulario-componente";
import { PasoDosPanelComponentes } from "./paso-dos-panel-componentes";
import s from "../page.module.css";

type PasoDosSeccionProps = {
  formulario: PasoDosFormularioComponenteProps;
  panel: PasoDosPanelComponentesProps;
};

export function PasoDosSeccion({ formulario, panel }: PasoDosSeccionProps) {
  return (
    <div className={s.stepTwoLayout}>
      <PasoDosFormularioComponente {...formulario} />
      <PasoDosPanelComponentes {...panel} />
    </div>
  );
}
