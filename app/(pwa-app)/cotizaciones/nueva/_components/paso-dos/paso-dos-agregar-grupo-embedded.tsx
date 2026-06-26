"use client";

import { useEffect, useRef } from "react";
import type { ComponentProps } from "react";

import { PasoDosAgregarGrupoSheet } from "./paso-dos-agregar-grupo-sheet";
import pageStyles from "../../page.module.css";
import styles from "./paso-dos-agregar-grupo-embedded.module.css";

type PasoDosAgregarGrupoEmbeddedProps = ComponentProps<typeof PasoDosAgregarGrupoSheet>;

/**
 * Adapta el wizard existente para que, en desktop, viva dentro del workspace
 * del Paso 2 en vez de bloquear la pantalla como overlay. El sheet original
 * sigue intacto como fallback para cualquier consumidor overlay.
 */
export function PasoDosAgregarGrupoEmbedded({
  isOpen,
  ...sheetProps
}: PasoDosAgregarGrupoEmbeddedProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = hostRef.current?.querySelector<HTMLElement>("[aria-modal='true']");
    if (!dialog) {
      return;
    }

    dialog.removeAttribute("aria-modal");
    dialog.setAttribute("role", "region");
    dialog.setAttribute("aria-label", "Asistente para agregar componente");
  }, [isOpen]);

  const embeddedSheetStyles = `
    @media (min-width: 861px) {
      .${styles.host} .${pageStyles.groupSheetOverlay} {
        position: static !important;
        inset: auto !important;
        display: block !important;
        width: 100% !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: transparent !important;
        z-index: auto !important;
      }

      .${styles.host} .${pageStyles.groupSheet} {
        position: static !important;
        width: 100% !important;
        max-width: none !important;
        max-height: min(720px, calc(100dvh - 188px)) !important;
        margin: 0 !important;
        border-radius: 20px !important;
        border: 1px solid rgba(200, 211, 227, 0.96) !important;
        box-shadow: 0 18px 38px rgba(27, 43, 74, 0.08) !important;
      }

      .${styles.host} .${pageStyles.groupSheetHandle} {
        display: none !important;
      }

      .${styles.host} .${pageStyles.groupSheetBody} {
        max-height: min(520px, calc(100dvh - 360px)) !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
      }
    }
  `;

  return (
    <div ref={hostRef} className={styles.host} data-open={isOpen ? "true" : "false"}>
      {isOpen ? <style>{embeddedSheetStyles}</style> : null}
      <PasoDosAgregarGrupoSheet {...sheetProps} isOpen={isOpen} />
    </div>
  );
}
