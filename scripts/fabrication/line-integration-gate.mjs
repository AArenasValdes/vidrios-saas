/** Gate integrado en fabrication:verify. No consulta red ni repara datos. */
export const LAYERS = ["catalogo", "precio_venta", "compra", "receta", "vidrios", "snapshot", "paridad_documentos"];
const STATUSES = ["aprobado", "pendiente", "ambiguo", "fallido"];

export function assertLineIntegrationReport(report, expectedLines) {
  if (!report || report.version !== 1 || report.origin !== "fixtures_locales" || !Array.isArray(report.rows)) {
    throw new Error("Informe de integración inexistente o con formato no reconocido.");
  }
  if (!report.rows.length || report.fixtures?.lineasDeclaradas !== expectedLines) {
    throw new Error("Informe sin catálogo completo o denominador de líneas inconsistente.");
  }
  if (report.remote?.consultas !== 0 || report.remote?.escrituras !== 0) {
    throw new Error("Un informe de CI basado en fixtures no puede declarar acceso remoto.");
  }
  if (report.fixtures?.configuracionesDeclaradas !== report.rows.length ||
      report.denominadores?.configuraciones !== report.rows.length ||
      report.denominadores?.fixtures !== report.rows.length || report.denominadores?.remotas !== 0) {
    throw new Error("Denominador de configuraciones incorrecto.");
  }
  const keys = new Set();
  const lineKeys = new Set();
  for (const row of report.rows) {
    if (row.scope !== "fixture" || !row.catalogKey || !row.configurationId || !Array.isArray(row.capas)) {
      throw new Error("Fila de integración incompleta o con origen remoto.");
    }
    lineKeys.add(row.catalogKey);
    const composite = `${row.catalogKey}\u0000${row.configurationId}`;
    if (keys.has(composite)) throw new Error(`Configuración repetida en informe: ${row.catalogKey}/${row.configurationId}`);
    keys.add(composite);
    if (row.capas.length !== LAYERS.length) throw new Error(`Faltan capas en ${row.catalogKey}`);
    if (!["commercial_only", "pending", "calculable", "validated"].includes(row.expectativaReceta)) {
      throw new Error(`Declaración de receta desconocida en ${row.catalogKey}`);
    }
    for (const capa of LAYERS) {
      const matches = row.capas.filter((c) => c.capa === capa);
      if (matches.length !== 1) throw new Error(`Capa duplicada o ausente: ${capa} en ${row.catalogKey}`);
      const check = matches[0];
      if (!STATUSES.includes(check.estado) || !check.causa || !check.fuente ||
          !["comprobada", "no_comprobada"].includes(check.verificacion)) {
        throw new Error(`Resultado sin estado, causa o fuente: ${capa}/${row.catalogKey}`);
      }
      if (check.verificacion === "no_comprobada" && (check.estado === "aprobado" || !check.pasoManual)) {
        throw new Error(`No comprobada sin paso manual o falsamente aprobada: ${capa}/${row.catalogKey}`);
      }
    }
    const recipe = row.capas.find((c) => c.capa === "receta");
    if (["calculable", "validated"].includes(row.expectativaReceta) &&
        (recipe?.estado !== "aprobado" || recipe.verificacion !== "comprobada")) {
      throw new Error(`Variante declarada calculable/validada sin contrato acreditado: ${row.catalogKey}/${row.configurationId}`);
    }
  }
  if (lineKeys.size !== expectedLines || report.denominadores.lineas !== expectedLines) {
    throw new Error("Líneas únicas y denominadores de catálogo no concuerdan.");
  }
  for (const capa of LAYERS) {
    const d = report.denominadores.porCapa?.[capa];
    const checks = report.rows.map((row) => row.capas.find((check) => check.capa === capa));
    const actual = Object.fromEntries(STATUSES.map((estado) => [estado, checks.filter((check) => check?.estado === estado).length]));
    const noComprobada = checks.filter((check) => check?.verificacion === "no_comprobada").length;
    if (!d || d.total !== report.rows.length ||
        STATUSES.some((estado) => d[estado] !== actual[estado]) || d.noComprobada !== noComprobada) {
      throw new Error(`Denominadores inválidos para ${capa}`);
    }
  }
  const importAudit = report.importaciones?.arquetipo;
  if (!importAudit || importAudit.origen !== "fixtures_locales" || !Array.isArray(importAudit.rows) ||
      !importAudit.fuente || importAudit.totalPresentaciones !== importAudit.rows.length ||
      !Number.isInteger(importAudit.referenciasConPrecio) ||
      importAudit.referenciasConPrecio > importAudit.totalPresentaciones ||
      importAudit.rows.some((r) => !STATUSES.includes(r.estado) || !r.causa || !r.fuente || r.proveedorComprobadoExternamente !== false)) {
    throw new Error("Auditoría de importación Arquetipo incompleta o con procedencia incorrecta.");
  }
  for (const estado of STATUSES) {
    if (importAudit.conteos?.[estado] !== importAudit.rows.filter((r) => r.estado === estado).length) {
      throw new Error(`Denominador de importación incorrecto: ${estado}`);
    }
  }
  const importIdentities = new Set();
  for (const row of importAudit.rows) {
    if (!row.technicalKey || !row.sku) throw new Error("Referencia importada sin identidad técnica/SKU.");
    const identity = `${row.technicalKey}\u0000${row.sku}`;
    if (importIdentities.has(identity)) throw new Error(`Referencia importada duplicada: ${row.technicalKey}/${row.sku}`);
    importIdentities.add(identity);
  }
  if (importAudit.conteos.fallido) throw new Error("Referencias importadas inconsistentes sin justificación documental.");
  if (report.rows.some((row) => row.capas.some((c) => c.estado === "fallido"))) {
    throw new Error("El informe contiene integraciones fallidas. Revisar line-integration.json.");
  }
  return { rows: report.rows.length, lines: expectedLines, layers: report.denominadores.porCapa };
}
