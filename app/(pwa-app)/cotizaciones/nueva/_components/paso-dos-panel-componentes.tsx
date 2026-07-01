"use client";

import type { PasoDosPanelComponentesProps } from "../_types/paso-dos";

import { PasoDosPanelHeader } from "./paso-dos/paso-dos-panel-header";
import { PasoDosPanelLista } from "./paso-dos/paso-dos-panel-lista";
import { PasoDosPanelResumen } from "./paso-dos/paso-dos-panel-resumen";
import type { PasoDosPanelDesktopClasses } from "./paso-dos/paso-dos-panel-resumen";
import d from "./paso-dos-panel-desktop.module.css";
import s from "../page.module.css";

export function PasoDosPanelComponentes({
  stepTwoListRef,
  ...props
}: PasoDosPanelComponentesProps) {
  const desktopClasses = d as unknown as PasoDosPanelDesktopClasses;

  if (props.isMobileViewport) {
    return (
      <aside
        className={`${s.card} ${s.stepTwoPanel} ${s.stepTwoPanelMobile} ${s.stepTwoPanelModeMobile}`}
        id="component-list"
      >
        <PasoDosPanelHeader {...props} />
        <PasoDosPanelLista {...props} stepTwoListRef={stepTwoListRef} />
        <PasoDosPanelResumen {...props} />
      </aside>
    );
  }

  return (
    <aside
      className={`${s.stepTwoPanel} ${s.stepTwoPanelModeDesktop} ${d.panel}`}
      id="component-list"
    >
      <div className={d.header}>
        <PasoDosPanelHeader {...props} />
      </div>
      <div className={d.scroll} ref={stepTwoListRef}>
        <PasoDosPanelLista {...props} stepTwoListRef={stepTwoListRef} />
      </div>
      <PasoDosPanelResumen {...props} layout="desktop" desktopClasses={desktopClasses} />
    </aside>
  );
}
