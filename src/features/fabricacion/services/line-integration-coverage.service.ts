/** Auditoría de identidades declaradas, sin IO ni inferencia por similitud. */
export type IntegrationStatus = "aprobado" | "pendiente" | "ambiguo" | "fallido";
export type IntegrationLayer =
  | "catalogo" | "precio_venta" | "compra" | "receta" | "vidrios" | "snapshot" | "paridad_documentos";
export type VerificationScope = "fixture" | "remoto";
export type IntegrationCheck = {
  capa: IntegrationLayer;
  estado: IntegrationStatus;
  verificacion: "comprobada" | "no_comprobada";
  causa: string;
  fuente: string;
  pasoManual?: string;
};

export type PurchaseProfile = {
  technicalCode: string;
  familyKey: string | null;
  finish: string | null;
  presentationId: string | null;
  providerKey: string | null;
  supplierSku: string | null;
  commercialLengthMm: number | null;
};
export type PurchaseReference = {
  technicalCode: string;
  familyKey: string;
  finish: string;
  presentationId: string;
  providerKey: string;
  supplierSku: string;
  commercialLengthMm: number;
  netPrice: number | null;
  currency: string | null;
  source: string;
};
export type IntegrationInput = {
  catalogKey: string;
  configurationId: string;
  name: string;
  catalogSource: string;
  scope: VerificationScope;
  commercial: { declared: boolean; exactPair: boolean; ambiguous?: boolean; reason?: string };
  sale: { configured: boolean; amount?: number | null; source?: string };
  purchase?: { profile: PurchaseProfile; references: readonly PurchaseReference[]; source: string };
  recipe: {
    expectation: "commercial_only" | "pending" | "calculable" | "validated";
    exactVariant: boolean;
    contractPassed?: boolean | null;
    evidence?: "documented" | "workshop_validated" | "unverified";
    source: string;
  };
  glass?: { coverage: "complete" | "partial" | "unavailable"; complete: number; pending: number; source: string };
  snapshot?: { saved: unknown; reopened: unknown; historicalBefore?: unknown; historicalAfter?: unknown; source: string };
  parity?: { checked: boolean; matching: boolean; source: string };
};
export type IntegrationRow = Pick<IntegrationInput, "catalogKey" | "configurationId" | "name" | "scope"> & {
  capas: IntegrationCheck[];
  expectativaReceta: IntegrationInput["recipe"]["expectation"];
  referenciaTecnica?: { estadoCatalogo: string; listaParaProbar: boolean; evidencia: string; perfilesReferenciales: number; codigosRecetaDocumentados: number; nota: string };
};

const unchecked = (capa: IntegrationLayer, causa: string, fuente: string, pasoManual: string): IntegrationCheck => ({
  capa, estado: "pendiente", verificacion: "no_comprobada", causa, fuente, pasoManual,
});
const checked = (capa: IntegrationLayer, estado: IntegrationStatus, causa: string, fuente: string): IntegrationCheck => ({
  capa, estado, verificacion: "comprobada", causa, fuente,
});

/** La ausencia de metadatos en snapshots legacy NO autoriza reconstruirlos por nombre o código. */
export function checkExactPurchase(profile: PurchaseProfile, references: readonly PurchaseReference[], source: string): IntegrationCheck {
  const capa = "compra";
  const fullIdentity = Boolean(profile.technicalCode && profile.familyKey && profile.finish &&
    profile.presentationId && profile.providerKey && profile.supplierSku &&
    Number.isFinite(profile.commercialLengthMm) && (profile.commercialLengthMm ?? 0) > 0);
  if (!fullIdentity) {
    return checked(capa, "pendiente", `Asociación de snapshot incompleta (${profile.technicalCode || "sin código"}); no se reconstruye por nombre, SKU ni similitud.`, source);
  }
  const matches = references.filter((entry) =>
    entry.technicalCode === profile.technicalCode &&
    entry.familyKey === profile.familyKey &&
    entry.finish === profile.finish &&
    entry.presentationId === profile.presentationId &&
    entry.providerKey === profile.providerKey &&
    entry.supplierSku === profile.supplierSku &&
    entry.commercialLengthMm === profile.commercialLengthMm);
  if (matches.length > 1) return checked(capa, "ambiguo", `${matches.length} referencias idénticas para una misma identidad técnica; no se elige una.`, source);
  if (!matches.length) {
    const sameCode = references.filter((entry) => entry.technicalCode === profile.technicalCode).length;
    return checked(capa, "pendiente", sameCode
      ? `Sin referencia exacta para ${profile.technicalCode}: existen ${sameCode} referencias por código, pero no concuerdan todas las dimensiones técnicas.`
      : `No existe referencia de compra para el código técnico ${profile.technicalCode}.`, source);
  }
  const [match] = matches;
  if (!match || !(Number.isFinite(match.netPrice) && (match.netPrice ?? 0) > 0) || !match.currency) {
    return checked(capa, "pendiente", `Presentación exacta sin precio neto positivo y moneda: ${profile.technicalCode}.`, source);
  }
  return checked(capa, "aprobado", `Coincidencia exacta de familia, código, acabado, presentación, proveedor, SKU y largo; precio neto informado.`, `${source}; ${match.source}`);
}

export function checkImportedReference(input: {
  code: string; name: string; sourceCode: string; sourceName: string; source: string;
}): IntegrationCheck {
  if (!input.source || !input.sourceCode || !input.sourceName) {
    return unchecked("compra", "La fila importada carece de código/nombre o procedencia original.", input.source || "sin fuente", "Cotejar la fila con la planilla o catálogo fuente exactos.");
  }
  return checked("compra", input.code === input.sourceCode && input.name === input.sourceName ? "aprobado" : "fallido",
    input.code === input.sourceCode && input.name === input.sourceName
      ? "Código y nombre coinciden exactamente con la referencia importada."
      : `Inconsistencia con fuente importada: código/nombre '${input.code} / ${input.name}' vs '${input.sourceCode} / ${input.sourceName}'.`, input.source);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function evaluateLineIntegration(input: IntegrationInput): IntegrationRow {
  const { catalogKey, configurationId, name, scope, catalogSource, commercial, sale, recipe } = input;
  const capas: IntegrationCheck[] = [];
  capas.push(commercial.ambiguous
    ? checked("catalogo", "ambiguo", commercial.reason ?? "Declaración comercial duplicada o ambigua.", catalogSource)
    : commercial.declared && commercial.exactPair
      ? checked("catalogo", "aprobado", "Par componente/apertura explícito en catálogo; no acredita renderizado de Guiada/Constructor.", catalogSource)
      : checked("catalogo", commercial.declared ? "pendiente" : "fallido", commercial.reason ?? "No existe par exacto de compatibilidad documentado.", catalogSource));
  capas.push(sale.configured && Number.isFinite(sale.amount) && (sale.amount ?? 0) > 0
    ? checked("precio_venta", "aprobado", "Precio de venta positivo declarado en fixture; persistencia del taller no acreditada.", sale.source ?? catalogSource)
    : checked("precio_venta", "pendiente", "Precio comercial sin configurar en catálogo base; puede existir un precio privado en organización.", sale.source ?? catalogSource));
  capas.push(input.purchase ? checkExactPurchase(input.purchase.profile, input.purchase.references, input.purchase.source)
    : unchecked("compra", "No se cargaron snapshots ni precios/presentaciones privadas para esta configuración.", catalogSource,
      "Verificar por organización la identidad técnica exacta, presentación, precio neto y estado histórico sin mutar registros."));
  if (recipe.expectation === "commercial_only") {
    capas.push(checked("receta", "aprobado", "Solo comercial: no se exige despiece.", recipe.source));
  } else if (recipe.expectation === "pending") {
    capas.push(checked("receta", "pendiente", "Receta declarada pendiente; no se considera un fallo de fabricación.", recipe.source));
  } else if (!recipe.exactVariant || recipe.contractPassed == null) {
    capas.push(unchecked("receta", "Se declara variante calculable/validada, pero falta ejecutar contrato exacto de geometría, vidrio y reglas.", recipe.source,
      "Ejecutar fixtures numéricos independientes y resolución exacta de variante."));
  } else if (!recipe.contractPassed) {
    capas.push(checked("receta", "fallido", "Falló el contrato ejecutable de la variante declarada calculable.", recipe.source));
  } else if (recipe.expectation === "validated" && recipe.evidence !== "workshop_validated") {
    capas.push(checked("receta", "fallido", "Marcada validada sin evidencia explícita de taller para esta variante.", recipe.source));
  } else {
    capas.push(checked("receta", "aprobado", recipe.expectation === "validated"
      ? "Contrato de variante aprobado; evidencia de taller declarada por separado."
      : "Contrato de variante calculable aprobado; NO equivale a validación de taller.", recipe.source));
  }
  if (!input.glass) capas.push(unchecked("vidrios", "No se comprobaron paños de receta ni medidas manuales congeladas.", catalogSource,
    "Abrir una cotización QA y comprobar cada referencia, geometría y paños manuales faltantes."));
  else capas.push(checked("vidrios", input.glass.coverage === "complete" && input.glass.pending === 0 ? "aprobado" : "pendiente",
    `Cobertura ${input.glass.coverage}: ${input.glass.complete} referencias completas, ${input.glass.pending} pendientes.`, input.glass.source));
  if (!input.snapshot) capas.push(unchecked("snapshot", "No se guardó/reabrió cotización de esta configuración en entorno QA.", catalogSource,
    "Guardar y reabrir en cuenta QA; comparar snapshot y verificar que el histórico sigue congelado."));
  else {
    const equal = stable(input.snapshot.saved) === stable(input.snapshot.reopened);
    const frozen = input.snapshot.historicalBefore === undefined ||
      stable(input.snapshot.historicalBefore) === stable(input.snapshot.historicalAfter);
    capas.push(checked("snapshot", equal && frozen ? "aprobado" : "fallido",
      equal && frozen ? "Snapshot guardado/reabierto coincide y no cambió el histórico comprobado." : "Divergencia al reabrir o mutación del histórico.", input.snapshot.source));
  }
  capas.push(!input.parity || !input.parity.checked
    ? unchecked("paridad_documentos", "Paridad de esta configuración no recorrida por servicio de PDF/Excel.", catalogSource,
      "Comparar datos de WorkMaterialsDocument con PDF y Excel generados por los servicios compartidos.")
    : checked("paridad_documentos", input.parity.matching ? "aprobado" : "fallido",
      input.parity.matching ? "Paridad contrastada en fixture mediante servicios de exportación compartidos." : "Materiales/cantidades/costos/cortes difieren entre salidas.", input.parity.source));
  return { catalogKey, configurationId, name, scope, expectativaReceta: recipe.expectation, capas };
}

export function summarizeIntegration(rows: readonly IntegrationRow[]) {
  const layers: IntegrationLayer[] = ["catalogo", "precio_venta", "compra", "receta", "vidrios", "snapshot", "paridad_documentos"];
  const byLayer = Object.fromEntries(layers.map((layer) => {
    const checks = rows.flatMap((row) => row.capas.filter((c) => c.capa === layer));
    return [layer, { total: checks.length, aprobado: checks.filter((c) => c.estado === "aprobado").length,
      pendiente: checks.filter((c) => c.estado === "pendiente").length,
      ambiguo: checks.filter((c) => c.estado === "ambiguo").length,
      fallido: checks.filter((c) => c.estado === "fallido").length,
      noComprobada: checks.filter((c) => c.verificacion === "no_comprobada").length }];
  }));
  return {
    lineas: new Set(rows.map((r) => r.catalogKey)).size,
    configuraciones: rows.length,
    fixtures: rows.filter((r) => r.scope === "fixture").length,
    remotas: rows.filter((r) => r.scope === "remoto").length,
    porCapa: byLayer,
  };
}

/** Comparación del propio expediente importado, NO contra el PDF original del proveedor. */
export function auditImportedCatalog(input: {
  source: string;
  technicalInputs: readonly {
    technicalKey: string; sourceCode: string; name: string;
    evidence?: { sourceReference?: string | null; page?: number | null } | null;
  }[];
  presentations: readonly {
    technicalKey: string; description: string; sku: string;
    netPrice?: number | null;
    associationEvidence?: { sourceReference?: string | null; page?: number | null; confidence?: string | null; note?: string | null } | null;
  }[];
}) {
  const technical = new Map<string, typeof input.technicalInputs[number][]>();
  for (const entry of input.technicalInputs) technical.set(entry.technicalKey, [...(technical.get(entry.technicalKey) ?? []), entry]);
  const rows = input.presentations.map((presentation) => {
    const candidates = technical.get(presentation.technicalKey) ?? [];
    const source = [input.source, presentation.associationEvidence?.sourceReference,
      presentation.associationEvidence?.page != null ? `pág. ${presentation.associationEvidence.page}` : null]
      .filter(Boolean).join("; ");
    const current = candidates[0];
    // A mismatch is documented when the imported association itself carries a
    // source and an explicit note. Do not require a particular wording or
    // confidence value: valid code-based associations can have abbreviated
    // supplier descriptions. Keep them visible as ambiguous rather than
    // silently rewriting either source name.
    const mismatchDocumented = Boolean(
      presentation.associationEvidence?.sourceReference?.trim() &&
      presentation.associationEvidence?.note?.trim()
    );
    let estado: IntegrationStatus;
    let causa: string;
    if (candidates.length > 1) {
      estado = "ambiguo";
      causa = `Hay ${candidates.length} códigos técnicos para la misma technicalKey '${presentation.technicalKey}'.`;
    } else if (!current || !current.sourceCode || !current.name) {
      estado = "fallido";
      causa = `Presentación '${presentation.sku}' sin código/nombre de origen asociado por technicalKey exacta.`;
    } else if (presentation.description === current.name) {
      estado = presentation.netPrice == null ? "pendiente" : "aprobado";
      causa = presentation.netPrice == null ? "Sin precio de compra en fixture; código/nombre enlazados." : "Descripción coincide con el código/nombre de la ficha importada; precio registrado en fixture.";
    } else {
      estado = mismatchDocumented ? "ambiguo" : "fallido";
      causa = `Diferencia de nombres en '${current.sourceCode}' (catálogo: '${current.name}', presentación: '${presentation.description}')${mismatchDocumented ? "; discrepancia documentada, sin resolver por similitud" : "; evidencia de discrepancia ausente"}.`;
    }
    return {
      technicalKey: presentation.technicalKey,
      sourceCode: current?.sourceCode ?? null,
      sku: presentation.sku,
      estado, causa, fuente: source,
      proveedorComprobadoExternamente: false,
    };
  }).sort((a, b) => a.technicalKey.localeCompare(b.technicalKey) || a.sku.localeCompare(b.sku));
  const counts = Object.fromEntries((["aprobado", "pendiente", "ambiguo", "fallido"] as const)
    .map((status) => [status, rows.filter((r) => r.estado === status).length]));
  return { origen: "fixtures_locales", fuente: input.source, totalPresentaciones: rows.length,
    referenciasConPrecio: input.presentations.filter((p) => p.netPrice != null).length,
    conteos: counts as Record<IntegrationStatus, number>, rows };
}
