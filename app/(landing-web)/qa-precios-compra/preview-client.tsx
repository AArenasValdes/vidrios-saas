"use client";

/** Vista temporal local para revisar la UI sin migrar ni escribir en Supabase. */
import { useState } from "react";
import { CostoTecnicoParcialPanel } from "@/app/print/cotizaciones/[id]/fabricacion/costo-tecnico-parcial-panel";
import { MisPreciosContent } from "@/app/(pwa-app)/configuracion/empresa/mis-precios/mis-precios-content";
import type { MyPricesCatalog } from "@/features/proveedor-catalogos/services/mis-precios.client.service";

const initialCatalog: MyPricesCatalog = {
  providers: [{
  providerKey: "xelena",
  providerName: "Xelena / Veratec",
  revision: "2026-06",
  percentage: 0,
  presentations: [
    ["67401VER000", "Marco corredera 2 hojas", "Blanco", 31476],
    ["67401VER200", "Marco corredera 2 hojas", "Negro", 85259],
    ["67414VER000", "Hoja corredera grande Sliding", "Blanco", 39033],
    ["67414VER200", "Hoja corredera grande Sliding", "Negro", 83381],
    ["67418VER000", "Traslapo corredera grande Sliding", "Blanco", 12601],
    ["66306VER000", "Junquillo vidrio 4 mm Sliding", "Blanco", 7582],
    ["61016VER001", "Riel Sliding 7400", null, 10940],
    ["69014STL001", "Refuerzo marco corredera 7400", null, 14635],
    ["61012VER000", "Tope estanco Sliding 2 rieles", "Blanco", 1076],
  ].map(([sku, name, finish, referenceNetPrice]) => ({
    presentationId: String(sku),
    familyKeys: sku === "66306VER000" ? ["veratec:sliding-7400", "veratec:elegans-60"] : ["veratec:sliding-7400"],
    sku: String(sku),
    name: String(name),
    finish: finish == null ? null : String(finish),
    purchaseUnit: sku === "61012VER000" ? "PCS" : "M",
    commercialLengthMm: sku === "61012VER000" ? null : 5800,
    referenceNetPrice: Number(referenceNetPrice),
    currency: "CLP",
    ownNetPrice: null,
    effective: { unitNetPrice: Number(referenceNetPrice), source: "reference" as const, currency: "CLP" },
  })),
  }],
};

export default function PurchasePriceVisualQa() {
  const [view, setView] = useState<"cost" | "prices">("cost");
  const [catalog, setCatalog] = useState(initialCatalog);
  const save = async (change:
    | { kind: "adjustment"; providerKey: string; percentage: number }
    | { kind: "override"; providerKey: string; presentationId: string; netPrice: number; currency: string }
    | { kind: "clear_override"; providerKey: string; presentationId: string }
  ) => {
    setCatalog((current) => {
      const providers = current.providers.map((provider) => {
      const percentage = change.kind === "adjustment" && provider.providerKey === change.providerKey ? change.percentage : provider.percentage;
      const presentations = provider.presentations.map((row) => {
        const ownNetPrice = change.kind === "override" && row.presentationId === change.presentationId
          ? change.netPrice
          : change.kind === "clear_override" && row.presentationId === change.presentationId
            ? null : row.ownNetPrice;
        return {
          ...row,
          ownNetPrice,
          effective: {
            unitNetPrice: ownNetPrice ?? Math.round((row.referenceNetPrice ?? 0) * (1 + percentage / 100) * 100) / 100,
            source: (ownNetPrice != null ? "organization_override" : percentage !== 0 ? "provider_adjustment" : "reference") as "organization_override" | "provider_adjustment" | "reference",
            currency: row.currency ?? "CLP",
          },
        };
      });
      return { ...provider, percentage, presentations };
      });
      return { providers };
    });
    return true;
  };

  return <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: 16 }} onClickCapture={(event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a[href="/configuracion/empresa/mis-precios"]')) {
      event.preventDefault();
      setView("prices");
    }
  }}>
    <div style={{ maxWidth: 1120, margin: "0 auto 18px", color: "#203047" }}>
      <strong>Vista local de demostración · Veratec 7400</strong>
      <p style={{ margin: "5px 0 12px" }}>Usa datos de prueba. Los cambios que hagas aquí solo viven en esta pestaña.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setView("cost")} style={{ minHeight: 44, padding: "0 16px" }}>Costo estimado</button>
        <button type="button" onClick={() => setView("prices")} style={{ minHeight: 44, padding: "0 16px" }}>Mis precios</button>
      </div>
    </div>
    {view === "cost" ? <CostoTecnicoParcialPanel quoteId="visual-qa" />
      : <MisPreciosContent catalog={catalog} error={null} busy={false} save={save} refresh={async () => {}} />}
  </div>;
}
