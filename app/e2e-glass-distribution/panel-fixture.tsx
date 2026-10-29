"use client";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { GlassDistributionPanel } from "../print/cotizaciones/[id]/fabricacion/vidrios/glass-distribution-panel";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const item = {
  id: "qa-item-1",
  codigo: "V1",
  nombre: "Corredera QA",
  tipo: "Ventana corredera",
  vidrio: "Float incoloro 5 mm",
  cantidad: 1,
  observaciones: encodeCotizacionItemPresentationMeta({
    sheetScheme: "2 hojas",
    colorHex: "#ffffff",
    material: "Aluminio",
  }),
  manualGlassMeasurements: { version: 2, entries: [] },
} as unknown as CotizacionWorkflowItem;

const glassTemplate = {
  id: 501,
  nombre: "Float incoloro 5 mm",
  categoria: "vidrio",
  material: "Cristal",
  catalogMetadata: {
    espesor: "5 mm",
    categoriaTecnica: "monolitico",
    revisionTecnicaExplicita: true,
    corteManualEstado: "confirmed",
    planchaAnchoMm: 2500,
    planchaAltoMm: 1800,
  },
  isActive: true,
  eliminadoEn: null,
} as unknown as CotizacionLineTemplate;

export default function GlassDistributionPanelE2eFixture() {
  async function saveManualMeasurements(itemId: string, value: unknown) {
    const response = await fetch("/__e2e/glass-distribution-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: "qa-h1", itemId, value }),
    });
    if (!response.ok) throw new Error("No se pudo simular el guardado QA.");
  }

  return (
    <main style={{ maxWidth: 860, margin: "32px auto", padding: 16 }}>
      <h1>Smoke QA H1 · cotización simulada</h1>
      <GlassDistributionPanel
        quoteId="qa-h1"
        quoteCode="COT-QA-H1"
        clientName="Cliente QA simulado"
        workName="Obra QA simulada"
        enabled
        items={[item]}
        templates={[glassTemplate]}
        onSaveManualGlassMeasurements={saveManualMeasurements}
      />
    </main>
  );
}
