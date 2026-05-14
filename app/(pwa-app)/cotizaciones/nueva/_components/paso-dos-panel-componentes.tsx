"use client";

import type { PasoDosPanelComponentesProps } from "../_types/paso-dos";

import { PasoDosPanelHeader } from "./paso-dos/paso-dos-panel-header";
import { PasoDosPanelLista } from "./paso-dos/paso-dos-panel-lista";
import { PasoDosPanelResumen } from "./paso-dos/paso-dos-panel-resumen";
import s from "../page.module.css";

export function PasoDosPanelComponentes(props: PasoDosPanelComponentesProps) {
  return (
    <aside
      className={`${s.card} ${s.stepTwoPanel} ${s.stepTwoPanelMobile} ${
        props.isMobileViewport ? s.stepTwoPanelModeMobile : s.stepTwoPanelModeDesktop
      }`}
      id="component-list"
    >
      <PasoDosPanelHeader {...props} />
      <PasoDosPanelLista {...props} />
      <PasoDosPanelResumen {...props} />
    </aside>
  );
}
