"use client";

import { useId, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

import type { CotizacionLineTemplateCatalogMetadata } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  formatLineProfileReferenceCode,
  formatLineProfileReferenceRowStatus,
  getLineTemplateWorkshopProfiles,
  LINE_PROFILE_REFERENCES_DISCLAIMER,
  summarizeLineProfileReferences,
} from "@/features/cotizaciones/line-templates/types/line-profile-references";

import s from "./line-profile-references-section.module.css";

type Props = {
  catalogMetadata: CotizacionLineTemplateCatalogMetadata | null | undefined;
  variant?: "desktop" | "mobile";
  compact?: boolean;
};

export function LineProfileReferencesSection({
  catalogMetadata,
  variant = "desktop",
  compact = false,
}: Props) {
  const panelId = useId();
  const workshopProfiles = getLineTemplateWorkshopProfiles(catalogMetadata);
  const [expanded, setExpanded] = useState(false);

  if (!workshopProfiles || workshopProfiles.profiles.length === 0) {
    return null;
  }

  const isDesktop = variant === "desktop";
  const summary = summarizeLineProfileReferences(workshopProfiles.profiles);
  const configuredLabel =
    summary.withCode > 0
      ? `${summary.withCode} con código`
      : "0 configurados";

  return (
    <section
      className={`${s.section} ${isDesktop ? s.sectionDesktop : s.sectionMobile} ${
        compact ? s.sectionCompact : ""
      }`}
      aria-label="Perfiles de referencia"
    >
      <button
        type="button"
        className={`${s.summaryToggle} ${compact ? s.summaryToggleCompact : ""}`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((current) => !current);
        }}
      >
        <span className={s.summaryCopy}>
          {compact ? (
            <strong>
              {summary.total} {summary.total === 1 ? "referencia" : "referencias"}
            </strong>
          ) : (
            <>
              <strong>Perfiles de referencia</strong>
              <span className={s.summaryMeta}>
                {summary.total} {summary.total === 1 ? "perfil" : "perfiles"} ·{" "}
                {configuredLabel}
              </span>
            </>
          )}
        </span>
        <span className={s.summaryAction}>
          {compact ? null : expanded ? "Ocultar" : "Ver perfiles"}
          <LuChevronDown
            aria-hidden
            className={expanded ? s.toggleIconOpen : s.toggleIcon}
          />
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className={s.panel}>
          <p className={s.disclaimer}>{LINE_PROFILE_REFERENCES_DISCLAIMER}</p>
          <div className={s.tableWrap}>
            <div className={s.tableHeader} aria-hidden="true">
              <span>Código</span>
              <span>Perfil</span>
              <span>Uso</span>
              <span>Estado</span>
            </div>
            <ul className={s.tableBody}>
              {workshopProfiles.profiles.map((profile, index) => (
                <li
                  key={`${profile.name}-${profile.role}-${index}`}
                  className={s.tableRow}
                >
                  <span className={s.cellCode}>
                    {formatLineProfileReferenceCode(profile)}
                  </span>
                  <span className={s.cellName}>{profile.name}</span>
                  <span className={s.cellRole}>{profile.role}</span>
                  <span
                    className={s.cellStatus}
                    data-status={profile.codeStatus}
                  >
                    {formatLineProfileReferenceRowStatus(profile)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
