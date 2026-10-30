"use client";

import { useState } from "react";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { ManualGlassPaneMeasurementsSnapshot } from "@/features/cotizaciones/types/manual-glass-pane-measurements";
import { GlassDistributionPanel } from "@/app/print/cotizaciones/[id]/fabricacion/vidrios/glass-distribution-panel";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const quoteItemId = "qa-guided-item";
const emptyMeasurements: ManualGlassPaneMeasurementsSnapshot = { version: 2, entries: [] };

const glassTemplate = {
  id: 501,
  nombre: "Float QA 5 mm",
  categoria: "vidrio",
  material: "Cristal",
  catalogMetadata: {
    espesor: "5 mm",
    categoriaTecnica: "monolitico",
    revisionTecnicaExplicita: true,
    corteManualEstado: "confirmed",
    formaCompraVidrio: "full_sheet",
    orientacionCorte: "fixed",
    planchaAnchoMm: 4000,
    planchaAltoMm: 2200,
  },
  isActive: true,
  eliminadoEn: null,
} as unknown as CotizacionLineTemplate;

export default function GlassGuidedE2eFixture() {
  const [manualMeasurements, setManualMeasurements] = useState<ManualGlassPaneMeasurementsSnapshot>(() => {
    if (typeof window === "undefined") return emptyMeasurements;
    try {
      const stored = window.localStorage.getItem("ventora-e2e-glass-guided");
      return stored ? JSON.parse(stored) as ManualGlassPaneMeasurementsSnapshot : emptyMeasurements;
    } catch {
      return emptyMeasurements;
    }
  });
  const item = {
    id: quoteItemId,
    codigo: "V1",
    nombre: "Corredera QA x3",
    tipo: "Ventana corredera",
    vidrio: "Float QA 5 mm",
    cantidad: 3,
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#ffffff",
      material: "Aluminio",
      fabricacionTipologia: "Corredera",
      sheetScheme: "2 hojas",
      vidrioLineTemplateId: "501",
    }),
    manualGlassMeasurements: manualMeasurements,
  } as unknown as CotizacionWorkflowItem;

  async function saveManualMeasurements(itemId: string, value: ManualGlassPaneMeasurementsSnapshot) {
    if (itemId !== quoteItemId) throw new Error("El fixture recibió un ítem inesperado.");
    const response = await fetch("/__e2e/glass-guided-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, value }),
    });
    if (!response.ok) throw new Error("No se pudo simular el guardado local QA.");
    window.localStorage.setItem("ventora-e2e-glass-guided", JSON.stringify(value));
    setManualMeasurements(value);
  }

  return <main style={{ maxWidth: 860, margin: "24px auto", padding: 16 }}>
    <h1>QA local simulado · Guiada → medidas finales → distribución</h1>
    <p>Corredera 2H · cantidad comercial 3 · dos paños por componente.</p>
    <GlassDistributionPanel
      quoteId="qa-guided"
      quoteCode="COT-QA-GUIDED"
      clientName="Cliente QA simulado"
      workName="Trabajo QA simulado"
      enabled
      items={[item]}
      templates={[glassTemplate]}
      onSaveManualGlassMeasurements={saveManualMeasurements}
    />
  </main>;
}
