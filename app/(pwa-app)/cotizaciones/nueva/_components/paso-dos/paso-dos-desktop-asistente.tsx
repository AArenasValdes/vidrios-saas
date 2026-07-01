"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";
import { CLP } from "@/features/cotizaciones/new-quote/workflow-ui";

import { PasoDosFormularioAcciones } from "./paso-dos-formulario-acciones";
import { PasoDosFormularioBloqueAjustes } from "./paso-dos-formulario-bloque-ajustes";
import { PasoDosFormularioBloqueConfiguracion } from "./paso-dos-formulario-bloque-configuracion";
import { PasoDosFormularioBloqueDetalles } from "./paso-dos-formulario-bloque-detalles";
import { PasoDosFormularioBloqueVidrio } from "./paso-dos-formulario-bloque-vidrio";

import s from "../../page.module.css";

const ASSISTANT_STEPS = [
  { id: 1 as const, label: "Base" },
  { id: 2 as const, label: "Componente" },
  { id: 3 as const, label: "Configuración" },
];

type Props = PasoDosFormularioComponenteProps;

export function PasoDosDesktopAsistente(props: Props) {
  const [stage, setStage] = useState<1 | 2 | 3>(3);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const previousItemsCountRef = useRef(props.itemsCount);
  const { componentForm, currentComponentPreviewSvg, linePricingSummary } = props;

  useEffect(() => {
    const shouldShowFeedback = props.itemsCount > previousItemsCountRef.current;

    previousItemsCountRef.current = props.itemsCount;
    if (!shouldShowFeedback) {
      return undefined;
    }

    const showTimeoutId = window.setTimeout(() => setShowAddedFeedback(true), 0);
    const hideTimeoutId = window.setTimeout(() => setShowAddedFeedback(false), 1800);

    return () => {
      window.clearTimeout(showTimeoutId);
      window.clearTimeout(hideTimeoutId);
    };
  }, [props.itemsCount]);

  const componentName = useMemo(() => {
    const system = componentForm.sistema?.trim() ?? "";
    if (!system || componentForm.tipo.toLowerCase().includes(system.toLowerCase())) {
      return componentForm.tipo;
    }

    return `${componentForm.tipo} ${system}`;
  }, [componentForm.sistema, componentForm.tipo]);

  const componentSubtitle = [
    componentForm.material,
    componentForm.configuracion || componentForm.sheetScheme,
    componentForm.vidrio,
  ].filter(Boolean).join(" · ");
  const baseSummary = [
    componentForm.material,
    componentForm.referencia.trim() || "Precio manual",
    componentForm.precioPorM2.trim() ? `${CLP(Number(componentForm.precioPorM2))}/m²` : null,
  ].filter(Boolean).join(" · ");
  const typeSummary = componentForm.tipo;
  const dimensionsSummary =
    componentForm.ancho.trim() && componentForm.alto.trim()
      ? `${componentForm.ancho} × ${componentForm.alto}`
      : "Sin medidas";
  const unitValue =
    linePricingSummary.precioUnitarioSugerido !== null
      ? CLP(linePricingSummary.precioUnitarioSugerido)
      : componentForm.precioPlantillaSugerido.trim()
        ? CLP(Number(componentForm.precioPlantillaSugerido))
        : componentForm.costoProveedorUnitario.trim()
          ? CLP(Number(componentForm.costoProveedorUnitario))
          : "Por definir";

  return (
    <section className={`${s.stepTwoFormCard} ${s.stepTwoFormCardDesktop} ${s.stepTwoDesktopAssistant}`}>
      <section className={s.stepTwoDesktopCreationHero} aria-label="Componente actual">
        <div className={s.stepTwoDesktopCreationCopy}>
          <div className={s.stepTwoDesktopCreationMeta}>
            <span>Estás creando</span>
            <small>{componentForm.codigo || "Borrador"}</small>
          </div>
          <h3>{componentName}</h3>
          <p>{componentSubtitle || "Configura el componente antes de agregarlo."}</p>
          <dl className={s.stepTwoDesktopCreationMetrics}>
            <div>
              <dt>Medidas</dt>
              <dd>{dimensionsSummary}</dd>
              <span>mm</span>
            </div>
            <div>
              <dt>Cantidad</dt>
              <dd>{componentForm.loteCantidad || componentForm.cantidad || "1"}</dd>
              <span>unidad</span>
            </div>
            <div>
              <dt>Valor unitario</dt>
              <dd>{unitValue}</dd>
              <span>CLP neto</span>
            </div>
          </dl>
          <button
            className={s.stepTwoDesktopCreationEdit}
            onClick={() => setStage(2)}
            type="button"
          >
            Editar componente
          </button>
        </div>
        <div className={s.stepTwoDesktopCreationPreview} aria-hidden="true">
          <div
            className={s.stepTwoDesktopCreationPreviewSvg}
            dangerouslySetInnerHTML={{ __html: currentComponentPreviewSvg }}
          />
        </div>
      </section>

      <div className={s.stepTwoDesktopStageRail} aria-label="Resumen de etapas">
        <button
          className={`${s.stepTwoDesktopStageSummary} ${stage === 1 ? s.stepTwoDesktopStageSummaryActive : ""}`}
          onClick={() => setStage(1)}
          type="button"
        >
          <span>Base</span>
          <strong>{baseSummary}</strong>
          <small>Editar</small>
        </button>
        <button
          className={`${s.stepTwoDesktopStageSummary} ${stage === 2 ? s.stepTwoDesktopStageSummaryActive : ""}`}
          onClick={() => setStage(2)}
          type="button"
        >
          <span>Tipo</span>
          <strong>{typeSummary}</strong>
          <small>Editar</small>
        </button>
        <button
          className={`${s.stepTwoDesktopStageSummary} ${s.stepTwoDesktopStageSummaryCurrent} ${
            stage === 3 ? s.stepTwoDesktopStageSummaryActive : ""
          }`}
          onClick={() => setStage(3)}
          type="button"
        >
          <span>{ASSISTANT_STEPS[2].label}</span>
          <strong>Configuración técnica</strong>
          <small>Activa</small>
        </button>
      </div>

      <div className={s.stepTwoDesktopAssistantScroll}>
        <div className={s.formFields}>
          <PasoDosFormularioBloqueConfiguracion {...props} desktopAssistantStage={stage} />
          {stage === 3 ? (
            <>
              <PasoDosFormularioBloqueAjustes {...props} />
              <PasoDosFormularioBloqueVidrio {...props} />
              <PasoDosFormularioBloqueDetalles {...props} />
            </>
          ) : null}
        </div>
      </div>

      <div className={s.stepTwoDesktopAssistantFooter}>
        {showAddedFeedback ? (
          <div className={s.stepTwoDesktopAddedFeedback} role="status">
            Componente agregado
          </div>
        ) : null}
        <PasoDosFormularioAcciones {...props} />
      </div>
    </section>
  );
}
