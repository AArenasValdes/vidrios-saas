"use client";

import { useEffect, useState } from "react";
import { LuChevronDown, LuSparkles } from "react-icons/lu";

import {
  CATALOGO_BASES_COLLAPSE_THRESHOLD,
  type CatalogoInicioRapidoItem,
} from "@/features/cotizaciones/line-templates/services/catalogo-usar-base-ventora.service";

import s from "./lineas-precios-page-client.module.css";

type Props = {
  recommendations: CatalogoInicioRapidoItem[];
  privateLineCount: number;
  isUsingBase: boolean;
  usingBaseId: string | null;
  onUseBase: (recommendation: CatalogoInicioRapidoItem) => void;
  catalogRegionLabel?: string | null;
};

export function CatalogoBasesVentoraSection({
  recommendations,
  privateLineCount,
  isUsingBase,
  usingBaseId,
  onUseBase,
  catalogRegionLabel = null,
}: Props) {
  const shouldCollapseByDefault =
    privateLineCount >= CATALOGO_BASES_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!shouldCollapseByDefault);

  useEffect(() => {
    setExpanded(!shouldCollapseByDefault);
  }, [shouldCollapseByDefault]);

  if (recommendations.length === 0) return null;

  const plantillas = recommendations.filter(
    (entry) =>
      entry.kind === "plantilla_ventora" ||
      entry.kind === "plantilla_verificada"
  );
  const bases = recommendations.filter(
    (entry) => entry.kind === "base_estructural"
  );

  return (
    <section
      className={s.basesDiscover}
      aria-label="Plantillas y bases Ventora para empezar más rápido"
      data-collapsed={!expanded}
    >
      <div className={s.basesDiscoverHeader}>
        <div className={s.basesDiscoverCopy}>
          <span className={s.basesDiscoverEyebrow}>
            <LuSparkles aria-hidden />
            {catalogRegionLabel ?? "Plantillas"}
          </span>
          <h2>Empieza más rápido</h2>
          <p>
            {catalogRegionLabel
              ? "Ventora prepara líneas habituales del mercado chileno. Revisa las medidas de fabricación antes de activar."
              : "Ventora prepara los perfiles habituales. Revisa las medidas de fabricación antes de activar."}
          </p>
        </div>
        {shouldCollapseByDefault ? (
          <button
            type="button"
            className={s.basesDiscoverToggle}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Ocultar" : "Ver opciones"}
            <LuChevronDown aria-hidden data-open={expanded} />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className={s.basesDiscoverStacks}>
          {plantillas.length > 0 ? (
            <div className={s.basesDiscoverGrid} aria-label="Plantillas Ventora">
              {plantillas.map((recommendation) => (
                <article
                  key={recommendation.id}
                  className={s.baseTemplateCard}
                  data-kind={recommendation.kind}
                >
                  <div className={s.baseTemplateCopy}>
                    <strong>{recommendation.title}</strong>
                    {recommendation.subtitle ? (
                      <span className={s.baseTemplateSubtitle}>
                        {recommendation.subtitle}
                      </span>
                    ) : null}
                    <span className={s.baseTemplateBadge} data-kind={recommendation.kind}>
                      {recommendation.badge}
                    </span>
                    <small>{recommendation.meta}</small>
                  </div>
                  <button
                    type="button"
                    className={s.baseTemplateAction}
                    disabled={isUsingBase}
                    onClick={() => onUseBase(recommendation)}
                  >
                    {usingBaseId === recommendation.id
                      ? "Creando…"
                      : recommendation.actionLabel}
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {bases.length > 0 ? (
            <div className={s.basesDiscoverGeneric}>
              <span className={s.basesDiscoverGenericLabel}>Base estructural</span>
              <div className={s.basesDiscoverGrid}>
                {bases.map((recommendation) => (
                  <article
                    key={recommendation.id}
                    className={s.baseTemplateCard}
                    data-kind={recommendation.kind}
                  >
                    <div className={s.baseTemplateCopy}>
                      <strong>{recommendation.title}</strong>
                      <span className={s.baseTemplateBadge} data-kind={recommendation.kind}>
                        {recommendation.badge}
                      </span>
                      <small>{recommendation.meta}</small>
                    </div>
                    <button
                      type="button"
                      className={s.baseTemplateActionSecondary}
                      disabled={isUsingBase}
                      onClick={() => onUseBase(recommendation)}
                    >
                      {usingBaseId === recommendation.id
                        ? "Creando…"
                        : recommendation.actionLabel}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={s.basesDiscoverCollapsedHint}>
          {plantillas.length > 0
            ? `${plantillas.length} ${
                plantillas.length === 1 ? "plantilla" : "plantillas"
              } con ajustes`
            : null}
          {plantillas.length > 0 && bases.length > 0 ? " · " : null}
          {bases.length > 0
            ? `${bases.length} ${
                bases.length === 1 ? "base estructural" : "bases estructurales"
              }`
            : null}{" "}
          para copiar a tu catálogo privado.
        </p>
      )}
    </section>
  );
}
