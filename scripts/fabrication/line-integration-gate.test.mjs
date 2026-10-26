import assert from "node:assert/strict";
import { test } from "node:test";
import { assertLineIntegrationReport, LAYERS } from "./line-integration-gate.mjs";
function sample() {
  return {
    importaciones: { arquetipo: { origen: "fixtures_locales", fuente: "fixtures/arquetipo.ts",
      totalPresentaciones: 1, referenciasConPrecio: 1, conteos: { aprobado: 1, pendiente: 0, ambiguo: 0, fallido: 0 },
      rows: [{ technicalKey: "source:key", sku: "testsku", estado: "aprobado", causa: "fixture", fuente: "catálogo", proveedorComprobadoExternamente: false }],
    } },
    version: 1, origin: "fixtures_locales", remote: { consultas: 0, escrituras: 0 }, fixtures: { lineasDeclaradas: 1, configuracionesDeclaradas: 1 },
    rows: [{ catalogKey: "fixture:a", configurationId: "a:1", scope: "fixture", expectativaReceta: "pending", capas: LAYERS.map((capa) => ({
      capa, estado: "pendiente", verificacion: "no_comprobada", causa: "Falta evidencia", fuente: "fixture", pasoManual: "Revisar QA",
    })) }],
    denominadores: { lineas: 1, configuraciones: 1, fixtures: 1, remotas: 0, porCapa: Object.fromEntries(LAYERS.map((c) => [c, {
      total: 1, aprobado: 0, pendiente: 1, ambiguo: 0, fallido: 0, noComprobada: 1,
    }])) },
  };
}
test("gate acepta faltantes declarados sin falsos aprobados", () => {
  assert.equal(assertLineIntegrationReport(sample(), 1).rows, 1);
});
test("gate rechaza artefacto vacío/antiguo e inventario incompleto", () => {
  assert.throws(() => assertLineIntegrationReport({}, 1), /formato/);
  assert.throws(() => assertLineIntegrationReport(sample(), 2), /denominador/);
});
test("gate comprueba denominadores contra las filas y no acepta contadores adulterados", () => {
  let r = sample(); r.fixtures.configuracionesDeclaradas = 8;
  assert.throws(() => assertLineIntegrationReport(r, 1), /Denominador de configuraciones/);
  r = sample(); r.denominadores.porCapa.vidrios.noComprobada = 0;
  assert.throws(() => assertLineIntegrationReport(r, 1), /Denominadores inválidos para vidrios/);
  r = sample(); r.rows[0].capas[0].estado = "ambiguo";
  assert.throws(() => assertLineIntegrationReport(r, 1), /Denominadores inválidos para catalogo/);
});
test("gate rechaza resultados sin fuente, sin manual o que parecen provenir de base remota", () => {
  let r = sample(); r.rows[0].capas[0].fuente = "";
  assert.throws(() => assertLineIntegrationReport(r, 1), /fuente/);
  r = sample(); r.rows[0].capas[0].pasoManual = "";
  assert.throws(() => assertLineIntegrationReport(r, 1), /paso manual/);
  r = sample(); r.remote.escrituras = 1;
  assert.throws(() => assertLineIntegrationReport(r, 1), /acceso remoto/);
});
test("gate rechaza fail real, pero permite pendiente y ambiguo", () => {
  let r = sample(); r.rows[0].capas[0].verificacion = "comprobada";
  r.rows[0].capas[0].estado = "fallido";
  r.denominadores.porCapa.catalogo.fallido = 1; r.denominadores.porCapa.catalogo.pendiente = 0; r.denominadores.porCapa.catalogo.noComprobada = 0;
  assert.throws(() => assertLineIntegrationReport(r, 1), /fallidas/);
  r = sample(); r.rows[0].capas[0].verificacion = "comprobada";
  r.rows[0].capas[0].estado = "ambiguo";
  r.denominadores.porCapa.catalogo.ambiguo = 1; r.denominadores.porCapa.catalogo.pendiente = 0; r.denominadores.porCapa.catalogo.noComprobada = 0;
  assert.doesNotThrow(() => assertLineIntegrationReport(r, 1));
});

test("gate exige contrato comprobado a toda variante declarada calculable", () => {
  const r = sample(); r.rows[0].expectativaReceta = "calculable";
  assert.throws(() => assertLineIntegrationReport(r, 1), /contrato acreditado/);
});

test("gate rechaza referencias importadas inconsistentes sin evidencia", () => {
  const r = sample();
  r.importaciones.arquetipo.rows[0].estado = "fallido";
  r.importaciones.arquetipo.conteos = { aprobado: 0, pendiente: 0, ambiguo: 0, fallido: 1 };
  assert.throws(() => assertLineIntegrationReport(r, 1), /importadas inconsistentes/);
});
test("gate rechaza dos filas importadas con la misma identidad técnica y SKU", () => {
  const r = sample();
  r.importaciones.arquetipo.rows.push({ ...r.importaciones.arquetipo.rows[0] });
  r.importaciones.arquetipo.totalPresentaciones = 2;
  r.importaciones.arquetipo.referenciasConPrecio = 2;
  r.importaciones.arquetipo.conteos.aprobado = 2;
  assert.throws(() => assertLineIntegrationReport(r, 1), /Referencia importada duplicada/);
});
